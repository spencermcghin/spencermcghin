import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { citationsOf, citedBy, extractDriveId, statusOf } from '../../../shared/sources';
import { canManageMembers, canViewProject } from '../auth/permissions';
import { viewerFor } from '../auth/viewer';
import { getStore } from '../db';
import { folderInfo, listFolder } from '../google/drive';
import {
  accessTokenFor,
  authUrl,
  encryptToken,
  exchangeCode,
  googleConfigured,
  googleFake,
  revokeToken,
  signState,
  verifyState,
} from '../google/oauth';

/**
 * The source ledger endpoints: connecting a Google account, linking
 * folders to a project, and reading the ledger with its freshness flags.
 * The design is docs/plain: the app tracks names and modified times of
 * the documents canon was written from, and flags drift; it never reads
 * document contents (the OAuth scope cannot).
 */

const BACK_COOKIE = 'g_back';

function available(): boolean {
  return googleConfigured() || googleFake();
}

async function authorize(
  req: Request,
  res: Response,
  level: 'view' | 'manage'
): Promise<boolean> {
  const rulesetId = req.params.id;
  const store = getStore();
  if (!(await store.getRuleset(rulesetId))) {
    res.status(404).json({ message: 'Project not found' });
    return false;
  }
  const viewer = await viewerFor(req, rulesetId);
  if (!canViewProject(viewer)) {
    res.status(404).json({ message: 'Project not found' });
    return false;
  }
  if (level === 'manage' && !canManageMembers(viewer)) {
    res.status(403).json({ message: 'Only project admins can do that.' });
    return false;
  }
  return true;
}

/* ---------------- the Google connection ---------------- */

export async function googleStatus(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  const account = await getStore().getGoogleAccount(req.user.id);
  res.json({
    configured: available(),
    connected: Boolean(account),
    email: account?.email ?? null,
  });
}

function redirectUri(req: Request): string {
  return `${req.protocol}://${req.get('host')}/api/google/connect/callback`;
}

/** Where to send the browser after the round trip: same-origin paths only. */
function rememberBack(req: Request, res: Response) {
  const back = String(req.query.back ?? '/');
  res.cookie(BACK_COOKIE, back.startsWith('/') && !back.startsWith('//') ? back : '/', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
  });
}

export async function googleConnect(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (!available()) {
    return res.status(503).json({ message: 'Google connection is not configured.' });
  }
  rememberBack(req, res);

  if (googleFake()) {
    // The pretend flow: no Google, straight to connected.
    await getStore().putGoogleAccount(
      req.user.id,
      'fixture@example.com',
      encryptToken('fake-refresh-token')
    );
    return res.redirect(String(req.query.back ?? '/'));
  }
  res.redirect(authUrl(redirectUri(req), signState(req.user.id)));
}

export async function googleCallback(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  const back = String(req.cookies?.[BACK_COOKIE] ?? '/');
  res.clearCookie(BACK_COOKIE);

  const code = String(req.query.code ?? '');
  const state = String(req.query.state ?? '');
  if (!code || !verifyState(state, req.user.id)) {
    return res.redirect(back);
  }
  const grant = await exchangeCode(code, redirectUri(req));
  if (grant) {
    await getStore().putGoogleAccount(
      req.user.id,
      grant.email,
      encryptToken(grant.refreshToken)
    );
  }
  res.redirect(back);
}

export async function googleDisconnect(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  const store = getStore();
  const account = await store.getGoogleAccount(req.user.id);
  if (account && !googleFake()) await revokeToken(account.refreshToken);
  await store.deleteGoogleAccount(req.user.id);
  res.status(204).send();
}

/* ---------------- folders and the ledger ---------------- */

async function driveTokenFor(userId: string): Promise<string | null> {
  if (googleFake()) return 'fake';
  const account = await getStore().getGoogleAccount(userId);
  if (!account) return null;
  return accessTokenFor(account.refreshToken);
}

/** One sync pass over every folder a project watches. */
export async function syncProject(rulesetId: string): Promise<void> {
  const store = getStore();
  for (const folder of await store.listSourceFolders(rulesetId)) {
    const token = await driveTokenFor(folder.linkedBy);
    if (!token) continue; // The linker disconnected; the folder waits.
    const files = await listFolder(token, folder.externalId);
    if (!files) continue; // Drive said no this pass; try again next sweep.
    await store.reconcileSourceDocuments(
      folder.id,
      rulesetId,
      files,
      new Date().toISOString()
    );
  }
}

export async function listSources(req: Request, res: Response) {
  if (!(await authorize(req, res, 'view'))) return;
  const store = getStore();
  const rulesetId = req.params.id;

  const [folders, documents, map] = await Promise.all([
    store.listSourceFolders(rulesetId),
    store.listSourceDocuments(rulesetId),
    store.getNarrative(rulesetId),
  ]);

  const citations = map ? citationsOf(map) : new Map<string, Set<string>>();
  const names = new Map((map?.entities ?? []).map((e) => [e.id, e.name]));

  res.json({
    configured: available(),
    folders,
    documents: documents.map((d) => {
      const cited = citedBy(d, citations);
      return {
        ...d,
        status: statusOf(d, cited),
        citedBy: cited.map((id) => ({ id, name: names.get(id) ?? id })),
      };
    }),
  });
}

export async function addSourceFolder(req: Request, res: Response) {
  if (!(await authorize(req, res, 'manage'))) return;
  if (!req.user) return;
  if (!available()) {
    return res.status(503).json({ message: 'Google connection is not configured.' });
  }

  const url = String(req.body?.url ?? '').trim();
  const externalId = extractDriveId(url) ?? (googleFake() && url ? url : null);
  if (!externalId) {
    return res.status(400).json({ message: 'That is not a Drive folder link.' });
  }

  const token = await driveTokenFor(req.user.id);
  if (!token) {
    return res
      .status(409)
      .json({ message: 'Connect your Google account first, then link the folder.' });
  }
  const info = await folderInfo(token, externalId);
  if (!info) {
    return res.status(404).json({
      message: 'Google did not show a folder there. Check the link and your access.',
    });
  }

  const folder = await getStore().addSourceFolder({
    id: randomUUID(),
    rulesetId: req.params.id,
    externalId: info.externalId,
    name: info.name,
    url: info.url,
    linkedBy: req.user.id,
  });
  // First sync straight away: an empty ledger row would look like a bug.
  await syncProject(req.params.id);
  res.status(201).json(folder);
}

export async function removeSourceFolder(req: Request, res: Response) {
  if (!(await authorize(req, res, 'manage'))) return;
  const gone = await getStore().removeSourceFolder(
    req.params.folderId,
    req.params.id
  );
  if (!gone) return res.status(404).json({ message: 'No such folder here.' });
  res.status(204).send();
}

export async function syncSources(req: Request, res: Response) {
  if (!(await authorize(req, res, 'manage'))) return;
  await syncProject(req.params.id);
  res.status(204).send();
}

export async function reviewSource(req: Request, res: Response) {
  if (!(await authorize(req, res, 'manage'))) return;
  const ok = await getStore().reviewSourceDocument(
    req.params.docId,
    req.params.id,
    new Date().toISOString()
  );
  if (!ok) return res.status(404).json({ message: 'No such document here.' });
  res.status(204).send();
}

/** The background sweep: every watched project, every interval. */
export async function syncAllProjects(): Promise<void> {
  if (!available()) return;
  for (const rulesetId of await getStore().listRulesetsWithSources()) {
    try {
      await syncProject(rulesetId);
    } catch (err) {
      console.error(`Source sync failed for ${rulesetId}:`, err);
    }
  }
}
