/**
 * Skill visibility.
 *
 * A project defines access roles, staff assign them to players, and a skill
 * can name the roles allowed to see it (Trait.visibleTo). The rules here
 * decide, for one viewer, which skills that viewer is shown.
 *
 * Role definitions and assignments belong to the project's membership, not
 * to the rules document -- they are governance, not game content. Only the
 * gate on the skill is content, which is why `visibleTo` lives on the trait
 * while the roles it names live outside the document. One consequence is
 * handled here: a gate may name roles the project no longer defines (the
 * role was deleted, or the ruleset was imported from another group). Those
 * ids are ignored, and a gate left naming nothing is void -- the skill is
 * visible. Failing open beats a skill invisibly locked to everyone with no
 * UI that can explain why.
 *
 * Kept pure and separate from the engine because it is access control, not a
 * game rule: a character's build does not depend on which roles its player
 * holds. The server enforces it; sharing the logic keeps client and server
 * giving one answer, testable with no database.
 */

import type { Id, Ruleset, Trait } from './rules-schema';

/**
 * A visibility role a project defines: "Magister", "Storyteller's circle".
 * Lives with the project's membership, never inside the ruleset document.
 */
export interface AccessRole {
  id: Id;
  name: string;
  description?: string;
}

export interface AccessContext {
  /**
   * Project staff -- a project admin or an app admin -- see every skill
   * regardless of gates. Everyone else sees only what their roles allow.
   */
  isStaff: boolean;
  /** Access role ids the viewer holds. Ignored when `isStaff` is true. */
  roleIds: readonly string[];
  /**
   * The role ids this project currently defines. When provided, gate entries
   * naming anything else are ignored (see above). Omit to treat every gate
   * entry as live -- the strict reading, right for tests and for callers
   * that have already validated the document.
   */
  definedRoleIds?: readonly string[];
}

/** The gate as it currently binds: only entries naming a defined role. */
function effectiveGate(trait: Trait, ctx: AccessContext): Id[] {
  const gate = trait.visibleTo ?? [];
  if (!ctx.definedRoleIds) return gate;
  const defined = new Set(ctx.definedRoleIds);
  return gate.filter((id) => defined.has(id));
}

/**
 * Whether this viewer may see this skill.
 *
 * A skill with no gate (or whose gate is void, see above) is visible to
 * every member -- gating is opt-in. A gated skill is visible when the viewer
 * holds at least one of its roles.
 */
export function traitVisibleTo(trait: Trait, ctx: AccessContext): boolean {
  if (ctx.isStaff) return true;
  const gate = effectiveGate(trait, ctx);
  if (gate.length === 0) return true;
  return gate.some((roleId) => ctx.roleIds.includes(roleId));
}

/**
 * Returns the ruleset as this viewer is allowed to see it: hidden skills are
 * dropped from `traits`. Staff get the ruleset untouched.
 *
 * `alsoKeepTraitIds` names skills to keep regardless of their gate -- pass a
 * character's held skill ids so that a player granted a gated skill still
 * sees it on their own sheet rather than having their build silently break.
 *
 * The identity of the ruleset object is preserved when nothing is filtered,
 * so the common case allocates nothing.
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
 * Drops role ids that no longer name a defined role. Used when reading a
 * member's stored assignments: a deleted role should stop granting anything
 * without a migration to scrub every membership row.
 */
export function activeRoleIds(
  definedRoleIds: readonly string[],
  roleIds: readonly string[]
): string[] {
  const defined = new Set(definedRoleIds);
  return roleIds.filter((id) => defined.has(id));
}
