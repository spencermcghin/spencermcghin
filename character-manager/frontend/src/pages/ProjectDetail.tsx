import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  characterApi,
  memberApi,
  rulesetApi,
  type Invite,
  type Member,
  type ProjectRole,
  type RosterEntry,
} from '../services/api';
import type { Ruleset } from '../../../shared/rules-schema';
import { useAuth } from '../auth/useAuth';

export default function ProjectDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const myRole: ProjectRole | null =
    members.find((m) => m.userId === user?.id)?.role ?? null;
  const isStaff = myRole === 'admin' || user?.appRole === 'admin';

  const load = useCallback(async () => {
    try {
      const [r, cs, ms] = await Promise.all([
        rulesetApi.get(id),
        characterApi.listForRuleset(id),
        memberApi.list(id),
      ]);
      setRuleset(r);
      setRoster(cs);
      setMembers(ms);
      setError(null);
    } catch {
      setError('Could not load this project.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Invites are staff-only, so this request would 403 for a member.
  useEffect(() => {
    if (!isStaff) return;
    memberApi.listInvites(id).then(setInvites).catch(() => setInvites([]));
  }, [id, isStaff]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await characterApi.create(id, name.trim());
    setName('');
    await load();
  };

  const makeInvite = async () => {
    const { token } = await memberApi.createInvite(id);
    setNewLink(`${window.location.origin}/join/${token}`);
    setInvites(await memberApi.listInvites(id));
  };

  const exportJson = () => {
    if (!ruleset) return;
    const blob = new Blob([JSON.stringify(ruleset, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ruleset.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <div className="error">{error}</div>;
  if (!ruleset) return <p className="muted">Not found.</p>;

  const stat = (label: string, value: number) => (
    <div key={label} className="attribute-item">
      <dd>{value}</dd>
      <dt>{label}</dt>
    </div>
  );

  return (
    <div className="project-detail">
      <div className="header">
        <div>
          <h1>{ruleset.name}</h1>
          <p className="muted">
            Version {ruleset.version} · <span className="role-badge">{myRole ?? 'app admin'}</span>
          </p>
        </div>
        <div className="actions">
          <button className="button" onClick={exportJson}>
            Export
          </button>
          <Link to="/design-options" className="button">
            Builder options
          </Link>
          {isStaff && (
            <>
              <Link to={`/projects/${id}/design`} className="button">
                Graph view
              </Link>
              <Link to={`/projects/${id}/edit`} className="button button-primary">
                Edit rules
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Its own block rather than a muted byline: on the ruleset a new
          account starts with, this paragraph is the orientation. */}
      {ruleset.description && <p className="project-blurb">{ruleset.description}</p>}

      <div className="character-info-grid">
        <div className="info-card">
          <h2>Ruleset</h2>
          <dl className="attributes">
            {stat('Currencies', ruleset.currencies.length)}
            {stat('Archetypes', ruleset.packages.length)}
            {stat('Trees', ruleset.traitGroups.length)}
            {stat('Skills', ruleset.traits.length)}
            {stat('Tracks', ruleset.tracks.length)}
            {stat('Caps', ruleset.purchaseRules.length)}
          </dl>
        </div>

        <div className="info-card">
          <h2>Members</h2>
          <ul className="member-list">
            {members.map((m) => (
              <li key={m.userId}>
                <span className="member-name">
                  {m.displayName}
                  {m.userId === user?.id && <span className="you-tag">you</span>}
                </span>
                {isStaff ? (
                  <span className="member-actions">
                    <select
                      value={m.role}
                      aria-label={`Role for ${m.displayName}`}
                      onChange={async (e) => {
                        try {
                          setMembers(
                            await memberApi.setRole(
                              id,
                              m.userId,
                              e.target.value as ProjectRole
                            )
                          );
                        } catch {
                          setError('A project must keep at least one admin.');
                        }
                      }}
                    >
                      <option value="admin">admin</option>
                      <option value="member">member</option>
                    </select>
                    <button
                      className="button button-small button-danger"
                      onClick={async () => {
                        if (!confirm(`Remove ${m.displayName} from this project?`)) return;
                        try {
                          await memberApi.remove(id, m.userId);
                          await load();
                        } catch {
                          setError('A project must keep at least one admin.');
                        }
                      }}
                    >
                      Remove
                    </button>
                  </span>
                ) : (
                  <span className="role-badge">{m.role}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {isStaff && (
        <div className="info-card full-width" style={{ marginBottom: '2.5rem' }}>
          <h2>Invite Players</h2>
          <p className="muted">
            Anyone with the link joins as a member. Links expire after 30 days and
            can be revoked at any time.
          </p>
          <div className="chip-row" style={{ marginTop: '1rem' }}>
            <button className="button button-primary button-small" onClick={makeInvite}>
              Create invite link
            </button>
          </div>

          {newLink && (
            <div className="invite-link">
              <code>{newLink}</code>
              <button
                className="button button-small"
                onClick={() => navigator.clipboard?.writeText(newLink)}
              >
                Copy
              </button>
            </div>
          )}

          {invites.filter((i) => !i.revokedAt).length > 0 && (
            <ul className="invite-list">
              {invites
                .filter((i) => !i.revokedAt)
                .map((i) => (
                  <li key={i.id}>
                    <span className="muted">
                      created {new Date(i.createdAt).toLocaleDateString()} · used{' '}
                      {i.uses} time{i.uses === 1 ? '' : 's'}
                    </span>
                    <button
                      className="button button-small button-danger"
                      onClick={async () => {
                        await memberApi.revokeInvite(id, i.id);
                        setInvites(await memberApi.listInvites(id));
                        setNewLink(null);
                      }}
                    >
                      Revoke
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <div className="header" style={{ marginTop: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Characters</h1>
      </div>

      <form className="inline-form" onSubmit={create}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New character name…"
          aria-label="New character name"
        />
        <button className="button button-primary" disabled={!name.trim()}>
          Add Character
        </button>
      </form>

      {roster.length === 0 ? (
        <div className="empty-state">
          <p>No characters in this project yet.</p>
        </div>
      ) : (
        <div className="character-grid">
          {roster.map((c) => (
            <div key={c.id} className="character-card">
              <h2>{c.name}</h2>
              <p className="character-info">
                {c.packageIds.length > 0
                  ? c.packageIds
                      .map((pid) => ruleset.packages.find((p) => p.id === pid)?.name ?? pid)
                      .join(' · ')
                  : 'No archetype'}
              </p>
              <p className="character-background">
                Played by {c.isMine ? 'you' : c.ownerName}
              </p>
              <div className="card-actions">
                {c.character ? (
                  <Link to={`/characters/${c.id}`} className="button button-small">
                    Open Sheet
                  </Link>
                ) : (
                  <span className="muted">Sheet is private</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="back-link">
        <Link to="/projects">Back to Projects</Link>
      </div>
    </div>
  );
}
