import { googleFake } from './oauth';

/**
 * The thin slice of the Drive API the ledger needs: what a folder is
 * called, and what is in it. Metadata only, by scope and by field list.
 */

export interface DriveFile {
  externalId: string;
  name: string;
  url: string;
  mimeType: string;
  modifiedAt: string;
}

export interface DriveFolderInfo {
  externalId: string;
  name: string;
  url: string;
}

const FOLDER_MIME = 'application/vnd.google-apps.folder';
/** Sanity caps: a linked folder is a project's source tray, not a corpus. */
const MAX_FILES = 2000;
const MAX_FOLDERS = 50;

export async function folderInfo(
  accessToken: string,
  folderId: string
): Promise<DriveFolderInfo | null> {
  if (googleFake()) return fakeFolderInfo(folderId);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}` +
      `?fields=id,name,mimeType,webViewLink&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const f = (await res.json()) as {
    id: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
  };
  if (f.mimeType !== FOLDER_MIME) return null;
  return {
    externalId: f.id,
    name: f.name,
    url: f.webViewLink ?? `https://drive.google.com/drive/folders/${f.id}`,
  };
}

/**
 * Every document under a folder, subfolders included, breadth-first with
 * caps. Subfolders contribute their contents but are not documents
 * themselves.
 */
export async function listFolder(
  accessToken: string,
  folderId: string
): Promise<DriveFile[] | null> {
  if (googleFake()) return fakeListFolder(folderId);
  const files: DriveFile[] = [];
  const queue = [folderId];
  let foldersSeen = 0;

  while (queue.length > 0 && files.length < MAX_FILES && foldersSeen < MAX_FOLDERS) {
    const current = queue.shift()!;
    foldersSeen++;
    let pageToken: string | undefined;
    do {
      const q = new URLSearchParams({
        q: `'${current}' in parents and trashed = false`,
        fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink)',
        pageSize: '1000',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      });
      if (pageToken) q.set('pageToken', pageToken);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${q}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        nextPageToken?: string;
        files: {
          id: string;
          name: string;
          mimeType: string;
          modifiedTime: string;
          webViewLink?: string;
        }[];
      };
      for (const f of data.files) {
        if (f.mimeType === FOLDER_MIME) {
          queue.push(f.id);
        } else if (files.length < MAX_FILES) {
          files.push({
            externalId: f.id,
            name: f.name,
            url: f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`,
            mimeType: f.mimeType,
            modifiedAt: f.modifiedTime,
          });
        }
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  }
  return files;
}

/* ---------------- the pretend Drive ----------------
 * Dev-only fixtures behind GOOGLE_FAKE=1, so the whole feature can be
 * exercised in a browser with no Google project at all. The second doc
 * reports itself freshly modified on every listing, so the first sync
 * reads current and the next flags it stale. */

function fakeFolderInfo(folderId: string): DriveFolderInfo {
  return {
    externalId: folderId,
    name: 'Plot Documents (fixture)',
    url: `https://drive.google.com/drive/folders/${folderId}`,
  };
}

function fakeListFolder(folderId: string): DriveFile[] {
  const churn = new Date().toISOString();
  return [
    {
      externalId: 'fake-players-guide-0001',
      name: "Player's Guide",
      url: 'https://docs.google.com/document/d/fake-players-guide-0001/edit',
      mimeType: 'application/vnd.google-apps.document',
      modifiedAt: '2026-08-01T12:00:00.000Z',
    },
    {
      externalId: 'fake-plot-meeting-0002',
      name: 'Plot Meeting Notes',
      url: 'https://docs.google.com/document/d/fake-plot-meeting-0002/edit',
      mimeType: 'application/vnd.google-apps.document',
      modifiedAt: churn,
    },
    {
      externalId: `fake-new-doc-${folderId.slice(0, 6)}`,
      name: 'Event 11 Sketch',
      url: `https://docs.google.com/document/d/fake-new-doc-${folderId.slice(0, 6)}/edit`,
      mimeType: 'application/vnd.google-apps.document',
      modifiedAt: '2026-09-18T09:00:00.000Z',
    },
  ];
}
