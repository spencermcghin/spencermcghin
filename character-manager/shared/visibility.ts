/**
 * Skill visibility.
 *
 * A project defines access roles (Ruleset.accessRoles), assigns them to
 * players, and marks skills with the roles allowed to see them
 * (Trait.visibleTo). The rules here decide, for one viewer, which skills that
 * viewer is shown. Kept pure and separate from the engine because it is access
 * control, not a game rule: the engine never consults it, and a character's
 * build does not depend on which roles its player holds.
 *
 * The decisions live here rather than in a controller so the server (which
 * enforces the boundary) and the client (which need not render what it will
 * never receive) can share one answer, and so the answer can be tested with no
 * database.
 */

import type { Id, Ruleset, Trait } from './rules-schema';

export interface AccessContext {
  /**
   * Project staff -- a project admin or an app admin -- see every skill
   * regardless of gates. Everyone else sees only what their roles allow.
   */
  isStaff: boolean;
  /** Access role ids the viewer holds. Ignored when `isStaff` is true. */
  roleIds: readonly string[];
}

/**
 * Whether this viewer may see this skill.
 *
 * A skill with no `visibleTo` (or an empty one) is visible to every member --
 * gating is opt-in, so a ruleset that never sets it behaves exactly as before.
 * A gated skill is visible when the viewer holds at least one of its roles.
 */
export function traitVisibleTo(trait: Trait, ctx: AccessContext): boolean {
  if (ctx.isStaff) return true;
  const gate = trait.visibleTo;
  if (!gate || gate.length === 0) return true;
  return gate.some((roleId) => ctx.roleIds.includes(roleId));
}

/**
 * Returns the ruleset as this viewer is allowed to see it: hidden skills are
 * dropped from `traits`. Staff get the ruleset untouched.
 *
 * `alsoKeepTraitIds` names skills to keep regardless of their gate -- pass a
 * character's held skill ids so that a player granted a gated skill still sees
 * it on their own sheet rather than having their build silently break.
 *
 * Per-skill only: whole trees are not gated in this version, so `traitGroups`
 * and everything else pass through unchanged. A visible skill whose
 * prerequisite names a hidden skill keeps that reference; the prerequisite
 * simply cannot be satisfied through the catalogue, which is the intended
 * effect. The identity of the ruleset object is preserved when nothing is
 * filtered, so the common case allocates nothing.
 */
export function filterRulesetForViewer(
  ruleset: Ruleset,
  ctx: AccessContext,
  opts: { alsoKeepTraitIds?: Iterable<Id> } = {}
): Ruleset {
  if (ctx.isStaff) return ruleset;

  const keep = new Set(opts.alsoKeepTraitIds ?? []);
  const visible = ruleset.traits.filter(
    (t) => keep.has(t.id) || traitVisibleTo(t, ctx)
  );
  if (visible.length === ruleset.traits.length) return ruleset;
  return { ...ruleset, traits: visible };
}

/**
 * Drops role ids that no longer name a defined access role. Used when reading
 * a member's stored assignments: a role deleted from the ruleset should stop
 * granting anything, without a migration to scrub every membership row.
 */
export function activeRoleIds(
  ruleset: Pick<Ruleset, 'accessRoles'>,
  roleIds: readonly string[]
): string[] {
  const defined = new Set((ruleset.accessRoles ?? []).map((r) => r.id));
  return roleIds.filter((id) => defined.has(id));
}
