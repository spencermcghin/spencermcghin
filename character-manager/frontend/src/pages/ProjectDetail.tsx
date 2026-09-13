import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  accessRoleApi,
  characterApi,
  memberApi,
  rulesetApi,
  type AccessRole,
  type Invite,
  type Member,
  type ProjectRole,
  type RosterEntry,
} from '../services/api';
import type { Ruleset } from '../../../shared/rules-schema';
import { balances, indexRuleset } from '../../../shared/engine';
import { useAuth } from '../auth/useAuth';
import Hint from '../components/Hint';
import ProjectNav from '../components/ProjectNav';
import SectionCard from '../components/SectionCard';
import Sigil from '../components/Sigil';
import Toolbar from '../components/Toolbar';

export default function ProjectDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [accessRoles, setAccessRoles] = useState<AccessRole[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Bulk award state.
  const [selected, setSelected] = useState<string[]>([]);
  const [awardAmount, setAwardAmount] = useState('1');
  const [awardCurrency, setAwardCurrency] = useState('');
  const [awarding, setAwarding] = useState(false);
  const [awardNote, setAwardNote] = useState<string | null>(null);

  const myRole: ProjectRole | null =
    members.find((m) => m.userId === user?.id)?.role ?? null;
  const isStaff = myRole === 'admin' || user?.appRole === 'admin';

  const load = useCallback(async () => {
    try {
      const [r, cs, ms, roles] = await Promise.all([
        rulesetApi.get(id),
        characterApi.listForRuleset(id),
        memberApi.list(id),
        accessRoleApi.list(id).catch(() => []),
      ]);
      setRuleset(r);
      setRoster(cs);
      setMembers(ms);
      setAccessRoles(roles);
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

  const idx = useMemo(() => (ruleset ? indexRuleset(ruleset) : null), [ruleset]);

  // Default to the first progression currency: awards are almost always
  // advancement points rather than in-game money.
  useEffect(() => {
    if (!ruleset || awardCurrency) return;
    const first =
      ruleset.currencies.find((c) => c.kind === 'progression') ?? ruleset.currencies[0];
    if (first) setAwardCurrency(first.id);
  }, [ruleset, awardCurrency]);

  // A character removed from the roster must not stay silently selected.
  useEffect(() => {
    const present = new Set(roster.map((c) => c.id));
    setSelected((s) => (s.every((x) => present.has(x)) ? s : s.filter((x) => present.has(x))));
  }, [roster]);

  const toggleSelected = (characterId: string) =>
    setSelected((s) =>
      s.includes(characterId) ? s.filter((x) => x !== characterId) : [...s, characterId]
    );

  const award = async () => {
    const amount = Number(awardAmount);
    if (!Number.isInteger(amount) || amount === 0 || selected.length === 0) return;
    setAwarding(true);
    setAwardNote(null);
    try {
      const result = await characterApi.award(id, {
        characterIds: selected,
        currencyId: awardCurrency,
        amount,
      });
      await load();
      setSelected([]);
      setAwardNote(result.message);
      setError(null);
    } catch (e) {
      // The server explains why it refused; repeating that logic here would
      // give two answers that can disagree.
      const message =
        (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Could not award points.';
      setError(message);
    } finally {
      setAwarding(false);
    }
  };

  // The server replaces a member's assignment wholesale and hands back the
  // fresh roster. Saves are chained through one queue and each computes its
  // set from the newest roster it can see: two quick ticks would otherwise
  // both start from the same stale copy, and the second would silently undo
  // the first.
  const membersRef = useRef<Member[]>([]);
  membersRef.current = members;
  const roleSaveQueue = useRef(Promise.resolve());
  const toggleMemberAccessRole = (userId: string, roleId: string) => {
    roleSaveQueue.current = roleSaveQueue.current.then(async () => {
      const current =
        membersRef.current.find((m) => m.userId === userId)?.accessRoles ?? [];
      const next = current.includes(roleId)
        ? current.filter((r) => r !== roleId)
        : [...current, roleId];
      try {
        const fresh = await memberApi.setAccessRoles(id, userId, next);
        membersRef.current = fresh;
        setMembers(fresh);
        setError(null);
      } catch {
        setError('Could not update access roles.');
      }
    });
  };

  // Role definitions save instantly, one action at a time -- governance has
  // no draft state to forget.
  const addAccessRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const roleName = newRoleName.trim();
    if (!roleName) return;
    try {
      await accessRoleApi.create(id, roleName);
      setNewRoleName('');
      setAccessRoles(await accessRoleApi.list(id));
      setError(null);
    } catch {
      setError('Could not add that role.');
    }
  };

  const renameAccessRole = async (roleId: string, roleName: string) => {
    const trimmed = roleName.trim();
    const current = accessRoles.find((r) => r.id === roleId);
    if (!current || !trimmed || trimmed === current.name) return;
    try {
      await accessRoleApi.update(id, roleId, { name: trimmed });
      setAccessRoles(await accessRoleApi.list(id));
      setError(null);
    } catch {
      setError('Could not rename that role.');
    }
  };

  const removeAccessRole = async (role: AccessRole) => {
    if (
      !confirm(
        `Delete "${role.name || role.id}"? Skills restricted to it become visible ` +
          'to everyone, and it is removed from any player who had it.'
      )
    )
      return;
    try {
      await accessRoleApi.remove(id, role.id);
      // Assignments were scrubbed server-side; refresh both lists.
      const [roles, ms] = await Promise.all([accessRoleApi.list(id), memberApi.list(id)]);
      setAccessRoles(roles);
      setMembers(ms);
      membersRef.current = ms;
      setError(null);
    } catch {
      setError('Could not delete that role.');
    }
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

  /** A tile that navigates when there is somewhere to go, and states a
      count when there is not. dt/dd cannot sit inside an anchor, so linked
      tiles use span twins with the same look. */
  const stat = (label: string, value: number, to?: string, title?: string) =>
    to ? (
      <Link key={label} className="attribute-item" to={to} title={title}>
        <span className="attribute-value">{value}</span>
        <span className="attribute-label">{label}</span>
      </Link>
    ) : (
      <div key={label} className="attribute-item">
        <span className="attribute-value">{value}</span>
        <span className="attribute-label">{label}</span>
      </div>
    );

  return (
    <div className="project-detail">
      <ProjectNav id={id} />
      <div className="header">
        <div>
          <h1>{ruleset.name}</h1>
          <p className="muted">
            Version {ruleset.version} · <span className="role-badge">{myRole ?? 'app admin'}</span>
          </p>
        </div>
        <div className="actions">
          {/* Navigation lives in the tab bar now; only true actions remain. */}
          <button className="button" onClick={exportJson}>
            Export
          </button>
        </div>
      </div>

      {/* Its own block rather than a muted byline: on the ruleset a new
          account starts with, this paragraph is the orientation. */}
      {ruleset.description && <p className="project-blurb">{ruleset.description}</p>}

      <div className="character-info-grid">
        <SectionCard title="Ruleset">
          <div className="attributes">
            {stat('Currencies', ruleset.currencies.length)}
            {stat('Archetypes', ruleset.packages.length)}
            {stat(
              'Trees',
              ruleset.traitGroups.length,
              `/projects/${id}/edit`,
              'Open the skill catalogue, grouped by tree'
            )}
            {stat(
              'Skills',
              ruleset.traits.length,
              `/projects/${id}/edit`,
              'Open the skill catalogue'
            )}
            {stat(
              'Tracks',
              ruleset.tracks.length,
              ruleset.tracks.length > 0
                ? `/projects/${id}/edit?group=track:${ruleset.tracks[0].id}`
                : undefined,
              ruleset.tracks.length > 0
                ? `Open the catalogue grouped by the ${ruleset.tracks[0].name} track`
                : undefined
            )}
            {stat('Caps', ruleset.purchaseRules.length)}
          </div>
        </SectionCard>

        <SectionCard title="Members">
          <ul className="member-list">
            {members.map((m) => {
              // The server refuses to demote or remove the last admin; the
              // controls go grey here too so nobody discovers that rule as
              // an error message after clicking.
              const lastAdmin =
                m.role === 'admin' &&
                members.filter((x) => x.role === 'admin').length <= 1;
              return (
              <li key={m.userId} className="member-row">
                <div className="member-top">
                  <span className="member-name">
                    {m.displayName}
                    {m.userId === user?.id && <span className="you-tag">you</span>}
                  </span>
                  {isStaff ? (
                    <span className="member-actions">
                      <select
                        value={m.role}
                        aria-label={`Role for ${m.displayName}`}
                        disabled={lastAdmin}
                        title={
                          lastAdmin
                            ? 'A project must keep at least one admin.'
                            : undefined
                        }
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
                        disabled={lastAdmin}
                        title={
                          lastAdmin
                            ? 'A project must keep at least one admin.'
                            : undefined
                        }
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
                </div>

                {/* Access roles gate what a player sees. Staff assign them;
                    the checkboxes are the "view all roles" surface too, since
                    each shows whether this member holds it. Only staff, so a
                    player never sees who else was given what. Admins hold
                    every role by right, so theirs is a statement, not a
                    checklist. */}
                {isStaff && accessRoles.length > 0 && (
                  <div className="member-roles">
                    <span className="member-roles-label">Access</span>
                    {m.role === 'admin' ? (
                      <span className="member-roles-all">
                        Sees everything (admin)
                      </span>
                    ) : (
                      accessRoles.map((role) => (
                        <label key={role.id} className="member-role-check">
                          <input
                            type="checkbox"
                            checked={m.accessRoles.includes(role.id)}
                            onChange={() => toggleMemberAccessRole(m.userId, role.id)}
                          />
                          <span>{role.name || role.id}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </li>
              );
            })}
          </ul>
        </SectionCard>

        {/* Role definitions are governance, so they live here with the
            members rather than inside the rules. Each action saves at once. */}
        {isStaff && (
          <SectionCard title="Access Roles">
            <p className="muted">
              Roles gate who can see restricted skills. Define them here, tick
              them on members above, and mark skills “Visible to” a role in the
              rules editor.
            </p>
            {accessRoles.length > 0 && (
              <ul className="role-list">
                {accessRoles.map((role) => (
                  <li key={role.id}>
                    <input
                      className="role-name-input"
                      defaultValue={role.name}
                      placeholder="Role name"
                      aria-label={`Name of role ${role.name || role.id}`}
                      // Saved when you leave the field or press Enter; the
                      // server is the source of truth, no draft to lose.
                      onBlur={(e) => void renameAccessRole(role.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                    />
                    <button
                      className="button button-small button-danger"
                      onClick={() => void removeAccessRole(role)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form className="inline-form" onSubmit={addAccessRole}>
              <input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="New role name, e.g. Magister"
                aria-label="New role name"
              />
              <button className="button button-small" disabled={!newRoleName.trim()}>
                Add Role
              </button>
            </form>
          </SectionCard>
        )}
      </div>

      {isStaff && (
        <SectionCard fullWidth className="invite-card" title="Invite Players">
          <p className="muted">
            Anyone with the link joins as a member. Links expire after 30 days and
            can be revoked at any time.
          </p>
          <div className="chip-row chip-row-spaced">
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
        </SectionCard>
      )}

      <div className="header section-header">
        <h1>Characters</h1>
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

      {isStaff && roster.length > 0 && (
        <Toolbar boxed spread label="Bulk award">
          <div className="award-select">
            <label className="award-check">
              <input
                type="checkbox"
                checked={selected.length === roster.length}
                // Indeterminate is the honest state for a partial selection;
                // a bare unchecked box invites a click that clears the lot.
                ref={(el) => {
                  if (el) el.indeterminate = selected.length > 0 && selected.length < roster.length;
                }}
                onChange={(e) =>
                  setSelected(e.target.checked ? roster.map((c) => c.id) : [])
                }
              />
              <span>
                {selected.length === 0
                  ? 'Select all'
                  : `${selected.length} of ${roster.length} selected`}
              </span>
            </label>
          </div>

          <div className="award-controls">
            <label className="award-field">
              <span>Award</span>
              <input
                type="number"
                step={1}
                value={awardAmount}
                aria-label="Amount to award"
                onChange={(e) => setAwardAmount(e.target.value)}
              />
            </label>
            <select
              value={awardCurrency}
              aria-label="Currency to award"
              onChange={(e) => setAwardCurrency(e.target.value)}
            >
              {ruleset.currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.abbreviation ?? c.name}
                </option>
              ))}
            </select>
            <button
              className="button button-small button-primary"
              disabled={awarding || selected.length === 0 || Number(awardAmount) === 0}
              onClick={award}
            >
              {awarding
                ? 'Awarding…'
                : selected.length === 0
                  ? 'Apply'
                  : `Apply to ${selected.length}`}
            </button>
            <Hint align="right">
              Adds the amount to every selected character's total for that
              currency. Use a negative number to take points back; correcting
              an award that went out wrong is the same operation in reverse.
              What a character has already spent is untouched, so a deduction
              that leaves them short shows up as overspent on their sheet
              rather than silently unpicking their build.
            </Hint>
          </div>
        </Toolbar>
      )}

      {awardNote && <p className="award-note">{awardNote}</p>}

      {roster.length === 0 ? (
        <div className="empty-state">
          <Sigil name="hexagram" />
          <p>No characters in this project yet.</p>
        </div>
      ) : (
        <div className="character-grid">
          {roster.map((c) => {
            const left =
              c.character && idx ? balances(c.character, idx) : null;
            return (
              <div
                key={c.id}
                className={`section-card character-card ${selected.includes(c.id) ? 'is-selected' : ''}`}
              >
                {isStaff && (
                  <label className="card-check">
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      aria-label={`Select ${c.name}`}
                      onChange={() => toggleSelected(c.id)}
                    />
                  </label>
                )}
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
                {left && (
                  <p className="card-balances">
                    {ruleset.currencies
                      .filter((cur) => cur.kind === 'progression')
                      .map((cur) => (
                        <span
                          key={cur.id}
                          className={(left[cur.id] ?? 0) < 0 ? 'is-negative' : ''}
                        >
                          {left[cur.id] ?? 0} {cur.abbreviation ?? cur.name}
                        </span>
                      ))}
                    <span className="muted">unspent</span>
                  </p>
                )}
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
            );
          })}
        </div>
      )}

      <div className="back-link">
        <Link to="/projects">Back to Projects</Link>
      </div>
    </div>
  );
}
