import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  accessRoleApi,
  characterApi,
  memberApi,
  rulesetApi,
  type AccessRole,
  type Member,
  type ProjectRole,
  type RosterEntry,
} from '../services/api';
import type { Ruleset } from '../../../shared/rules-schema';
import { useAuth } from '../auth/useAuth';
import { useConfirm } from '../components/ConfirmDialog';
import ProjectNav from '../components/ProjectNav';
import SectionCard from '../components/SectionCard';

/**
 * The project overview: what this project is, how big it is, and who is in
 * it. The character roster, bulk awards, and invites live on the Characters
 * tab; this page only counts them.
 */
export default function ProjectDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [accessRoles, setAccessRoles] = useState<AccessRole[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, confirmDialog] = useConfirm();

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
      !(await confirm({
        title: `Delete "${role.name || role.id}"?`,
        body:
          'Skills restricted to it become visible to everyone, and it is ' +
          'removed from any player who had it.',
      }))
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
      {confirmDialog}
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
            {stat(
              'Characters',
              roster.length,
              `/projects/${id}/characters`,
              'Open the roster'
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
                          if (
                            !(await confirm({
                              title: `Remove ${m.displayName} from this project?`,
                              body: 'Their characters stay; their access ends.',
                              action: 'Remove',
                            }))
                          )
                            return;
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

      <div className="back-link">
        <Link to="/projects">Back to Projects</Link>
      </div>
    </div>
  );
}
