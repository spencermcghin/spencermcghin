import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { inviteApi } from '../services/api';

type Preview = { projectId: string; projectName: string; alreadyMember: boolean };

export default function JoinProject() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const message = (err: unknown, fallback: string) =>
    (axios.isAxiosError(err)
      ? (err.response?.data as { message?: string } | undefined)?.message
      : undefined) ?? fallback;

  useEffect(() => {
    inviteApi
      .preview(token)
      .then(setPreview)
      .catch((err) => setError(message(err, 'This invite link is not valid.')));
  }, [token]);

  const accept = useCallback(async () => {
    setBusy(true);
    try {
      const result = await inviteApi.accept(token);
      navigate(`/projects/${result.projectId}`, { replace: true });
    } catch (err) {
      setError(message(err, 'Could not join this project.'));
      setBusy(false);
    }
  }, [token, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Join a project</h1>

        {error ? (
          <>
            <div className="error">{error}</div>
            <p className="muted">
              Ask whoever shared it for a fresh link.
            </p>
          </>
        ) : !preview ? (
          <p className="muted">Checking the link…</p>
        ) : (
          <>
            <p className="muted">
              You have been invited to <strong>{preview.projectName}</strong>.
            </p>
            {preview.alreadyMember ? (
              <>
                <p className="muted" style={{ marginTop: '1rem' }}>
                  You are already a member of this project.
                </p>
                <button
                  className="button button-primary auth-submit"
                  onClick={() => navigate(`/projects/${preview.projectId}`)}
                >
                  Open it
                </button>
              </>
            ) : (
              <button
                className="button button-primary auth-submit"
                disabled={busy}
                onClick={accept}
              >
                {busy ? 'Joining…' : `Join ${preview.projectName}`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
