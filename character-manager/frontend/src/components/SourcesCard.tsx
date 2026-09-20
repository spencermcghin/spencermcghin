import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  sourceApi,
  type LedgerDocument,
  type SourceStatus,
  type SourcesResponse,
} from '../services/api';
import { useConfirm } from './ConfirmDialog';
import Hint from './Hint';
import SectionCard from './SectionCard';
import './SourcesCard.css';

/**
 * The source ledger on the project overview: which folders the project
 * watches, what documents they hold, and whether the story has kept up.
 * The app never reads document contents; it lists names and modified
 * times, and joins them against the story's citations.
 */
export default function SourcesCard({
  rulesetId,
  isStaff,
}: {
  rulesetId: string;
  isStaff: boolean;
}) {
  const location = useLocation();
  const [data, setData] = useState<SourcesResponse | null>(null);
  const [google, setGoogle] = useState<{ connected: boolean; email: string | null }>();
  const [folderUrl, setFolderUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  const load = useCallback(async () => {
    try {
      const [sources, status] = await Promise.all([
        sourceApi.list(rulesetId),
        sourceApi.googleStatus(),
      ]);
      setData(sources);
      setGoogle(status);
    } catch {
      /* The card is an extra; the page stands without it. */
    }
  }, [rulesetId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) return null;
  // Nothing configured and nothing linked: members see nothing at all,
  // staff see the offer.
  if (!data.configured && data.folders.length === 0) return null;
  if (!isStaff && data.folders.length === 0) return null;

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;
      setError(message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const flagged = data.documents.filter((d) => d.status !== 'current');

  return (
    <SectionCard
      title={
        <>
          Sources
          <Hint align="right">
            The documents this story was written from. The app watches the
            linked folders and flags drift: a document that changed since it
            was last reviewed, one nothing cites yet, or a cited one that
            vanished. It reads names and dates only, never contents.
          </Hint>
        </>
      }
      className="sources-card"
    >
      {confirmDialog}
      {error && <div className="error">{error}</div>}

      {isStaff && !google?.connected && (
        <p className="muted">
          Link your Google account to watch Drive folders.{' '}
          <a
            className="button button-small"
            href={sourceApi.googleConnectUrl(location.pathname)}
          >
            Connect Google Drive
          </a>
        </p>
      )}

      {data.folders.length > 0 && (
        <ul className="sources-folders">
          {data.folders.map((f) => (
            <li key={f.id}>
              <a href={f.url} target="_blank" rel="noreferrer">
                {f.name}
              </a>
              <span className="muted">
                {f.lastSyncAt
                  ? `synced ${new Date(f.lastSyncAt).toLocaleString()}`
                  : 'not synced yet'}
              </span>
              {isStaff && (
                <button
                  className="ed-del"
                  title="Unlink folder"
                  onClick={async () => {
                    if (
                      await confirm({
                        title: `Unlink "${f.name}"?`,
                        body: 'Its ledger entries go with it. The folder itself is untouched.',
                        action: 'Unlink',
                      })
                    ) {
                      await act(() => sourceApi.removeFolder(rulesetId, f.id));
                    }
                  }}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isStaff && google?.connected && (
        <form
          className="sources-add"
          onSubmit={(e) => {
            e.preventDefault();
            if (!folderUrl.trim()) return;
            void act(async () => {
              await sourceApi.addFolder(rulesetId, folderUrl.trim());
              setFolderUrl('');
            });
          }}
        >
          <input
            value={folderUrl}
            placeholder="Paste a Drive folder link…"
            aria-label="Drive folder link"
            onChange={(e) => setFolderUrl(e.target.value)}
          />
          <button className="button button-small" disabled={busy || !folderUrl.trim()}>
            Link folder
          </button>
          {data.folders.length > 0 && (
            <button
              type="button"
              className="button button-small"
              disabled={busy}
              onClick={() => void act(() => sourceApi.sync(rulesetId))}
            >
              Sync now
            </button>
          )}
        </form>
      )}

      {data.documents.length > 0 &&
        (flagged.length === 0 ? (
          <p className="ok">
            All {data.documents.length} documents current. The story matches
            its sources.
          </p>
        ) : (
          <ul className="sources-docs">
            {flagged.map((d) => (
              <SourceRow
                key={d.id}
                doc={d}
                rulesetId={rulesetId}
                isStaff={isStaff}
                busy={busy}
                onReview={() => void act(() => sourceApi.review(rulesetId, d.id))}
              />
            ))}
          </ul>
        ))}
    </SectionCard>
  );
}

const STATUS_COPY: Record<SourceStatus, string> = {
  current: 'current',
  stale: 'changed since review',
  uncited: 'nothing cites this',
  missing: 'cited but gone',
};

function SourceRow({
  doc,
  rulesetId,
  isStaff,
  busy,
  onReview,
}: {
  doc: LedgerDocument;
  rulesetId: string;
  isStaff: boolean;
  busy: boolean;
  onReview: () => void;
}) {
  return (
    <li className={`source-row is-${doc.status}`}>
      <div className="source-row-main">
        <a href={doc.url} target="_blank" rel="noreferrer">
          {doc.name}
        </a>
        <span className={`source-chip is-${doc.status}`}>
          {STATUS_COPY[doc.status]}
        </span>
        {isStaff && doc.status === 'stale' && (
          <button className="button button-small" disabled={busy} onClick={onReview}>
            Still right
          </button>
        )}
      </div>
      {doc.citedBy.length > 0 && (
        <p className="source-row-cites muted">
          Cited by{' '}
          {doc.citedBy.slice(0, 5).map((c, i) => (
            <span key={c.id}>
              {i > 0 && ', '}
              <Link to={`/projects/${rulesetId}/story/${encodeURIComponent(c.id)}`}>
                {c.name}
              </Link>
            </span>
          ))}
          {doc.citedBy.length > 5 && ` and ${doc.citedBy.length - 5} more`}.
        </p>
      )}
    </li>
  );
}
