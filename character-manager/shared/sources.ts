/**
 * The source ledger: what the app knows about the documents a project's
 * canon was written from.
 *
 * Story entries cite documents ("Says who"). Linked folders tell the app
 * which documents exist and when they last changed. Joining the two gives
 * three honest signals, none of which rewrite anything:
 *
 *   stale    - the document changed after it was last reviewed here
 *   uncited  - the document exists but nothing in the story cites it
 *   missing  - something cites it, but it is gone from the linked folders
 *
 * Pure functions, shared between server and client and covered by the
 * engine tests.
 */

import type { NarrativeMap } from './narrative-schema';

export interface SourceDocument {
  id: string;
  rulesetId: string;
  folderId: string;
  /** The connector's id for the file; for Drive, the file id. */
  externalId: string;
  name: string;
  url: string;
  mimeType?: string;
  /** When the document itself last changed, per its host. */
  modifiedAt: string;
  firstSeenAt: string;
  lastSeenAt: string;
  /** Last time a person said "the story still matches this document". */
  reviewedAt: string | null;
  /** Set when the document stopped appearing in its folder. */
  missingAt: string | null;
}

export interface SourceFolder {
  id: string;
  rulesetId: string;
  externalId: string;
  name: string;
  url: string;
  /** Whose Drive connection the sync uses. */
  linkedBy: string;
  createdAt: string;
  lastSyncAt: string | null;
}

export type SourceStatus = 'current' | 'stale' | 'uncited' | 'missing';

/**
 * The Drive file id inside any of the URL shapes Drive hands out:
 * /file/d/<id>, /document/d/<id>, open?id=<id>, folders/<id>, and friends.
 * Null when the URL is not recognisably Drive's.
 */
export function extractDriveId(url: string): string | null {
  if (!/(?:drive|docs)\.google\.com/.test(url)) return null;
  const path = url.match(/\/(?:d|folders)\/([-\w]{10,})/);
  if (path) return path[1];
  const query = url.match(/[?&]id=([-\w]{10,})/);
  if (query) return query[1];
  return null;
}

/**
 * Which entities cite each document, matched by Drive file id when both
 * sides have one and by exact URL otherwise. Relations' sources count
 * toward both entities they connect, since reviewing either would surface
 * the note.
 */
export function citationsOf(map: NarrativeMap): Map<string, Set<string>> {
  const cited = new Map<string, Set<string>>();
  const add = (url: string | undefined, entityIds: string[]) => {
    if (!url) return;
    const key = extractDriveId(url) ?? url;
    const set = cited.get(key) ?? new Set<string>();
    for (const id of entityIds) set.add(id);
    cited.set(key, set);
  };
  for (const e of map.entities) {
    for (const s of e.sources) add(s.url, [e.id]);
  }
  for (const r of map.relations) {
    for (const s of r.sources) add(s.url, [r.fromId, r.toId]);
  }
  return cited;
}

/** The entity ids citing one ledger document. */
export function citedBy(
  doc: Pick<SourceDocument, 'externalId' | 'url'>,
  citations: Map<string, Set<string>>
): string[] {
  const hit = citations.get(doc.externalId) ?? citations.get(doc.url);
  return hit ? [...hit] : [];
}

/**
 * One status per document. Missing outranks everything when the document
 * is actually cited (a vanished document nobody cites is just gone, not a
 * problem); staleness outranks uncited because a changed document needs a
 * decision either way.
 */
export function statusOf(
  doc: SourceDocument,
  citedByIds: string[]
): SourceStatus {
  if (doc.missingAt) return citedByIds.length > 0 ? 'missing' : 'uncited';
  const reviewed = doc.reviewedAt ?? doc.firstSeenAt;
  if (doc.modifiedAt > reviewed) return 'stale';
  if (citedByIds.length === 0) return 'uncited';
  return 'current';
}
