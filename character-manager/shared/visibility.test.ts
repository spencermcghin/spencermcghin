import test from 'node:test';
import assert from 'node:assert/strict';

import type { Ruleset, Trait } from './rules-schema';
import {
  addAccessRole,
  emptyRuleset,
  removeAccessRole,
} from './ruleset-editor';
import {
  activeRoleIds,
  filterRulesetForViewer,
  traitVisibleTo,
} from './visibility';

function trait(id: string, visibleTo?: string[]): Trait {
  return { id, name: id, groupId: 'general', tags: [], visibleTo, tiers: [] };
}

/** A ruleset with an open skill and a magister-gated one. */
function fixture(): Ruleset {
  const r = emptyRuleset('game', 'Game');
  return {
    ...r,
    accessRoles: [
      { id: 'magister', name: 'Magister' },
      { id: 'initiate', name: 'Initiate' },
    ],
    traits: [trait('swordplay'), trait('forbidden-rite', ['magister'])],
  };
}

const member = (roleIds: string[]) => ({ isStaff: false, roleIds });
const staff = { isStaff: true, roleIds: [] as string[] };

test('an ungated skill is visible to any member', () => {
  const t = trait('swordplay');
  assert.equal(traitVisibleTo(t, member([])), true);
  assert.equal(traitVisibleTo(trait('x', []), member([])), true);
});

test('a gated skill is hidden from a member without the role', () => {
  assert.equal(traitVisibleTo(trait('rite', ['magister']), member([])), false);
  assert.equal(
    traitVisibleTo(trait('rite', ['magister']), member(['initiate'])),
    false
  );
});

test('a gated skill is visible to a member holding one of its roles', () => {
  assert.equal(
    traitVisibleTo(trait('rite', ['magister', 'elder']), member(['magister'])),
    true
  );
});

test('staff see every skill regardless of gate', () => {
  assert.equal(traitVisibleTo(trait('rite', ['magister']), staff), true);
});

test('filterRulesetForViewer drops hidden skills for a plain member', () => {
  const filtered = filterRulesetForViewer(fixture(), member([]));
  assert.deepEqual(
    filtered.traits.map((t) => t.id),
    ['swordplay']
  );
});

test('filterRulesetForViewer keeps gated skills the member can see', () => {
  const filtered = filterRulesetForViewer(fixture(), member(['magister']));
  assert.deepEqual(
    filtered.traits.map((t) => t.id).sort(),
    ['forbidden-rite', 'swordplay']
  );
});

test('staff get the exact same ruleset object back (no copy)', () => {
  const r = fixture();
  assert.equal(filterRulesetForViewer(r, staff), r);
});

test('alsoKeepTraitIds preserves a held skill the member could not otherwise see', () => {
  const filtered = filterRulesetForViewer(fixture(), member([]), {
    alsoKeepTraitIds: ['forbidden-rite'],
  });
  assert.deepEqual(
    filtered.traits.map((t) => t.id).sort(),
    ['forbidden-rite', 'swordplay']
  );
});

test('activeRoleIds discards ids that no longer name a defined role', () => {
  const r = fixture();
  assert.deepEqual(activeRoleIds(r, ['magister', 'ghost']), ['magister']);
  assert.deepEqual(activeRoleIds({ accessRoles: undefined }, ['magister']), []);
});

test('addAccessRole appends without disturbing an undefined list', () => {
  const r = addAccessRole(emptyRuleset('g', 'G'), { id: 'magister', name: 'Magister' });
  assert.deepEqual(r.accessRoles, [{ id: 'magister', name: 'Magister' }]);
});

test('removeAccessRole deletes the role and strips it from every gate', () => {
  const r = removeAccessRole(fixture(), 'magister');
  assert.deepEqual(
    (r.accessRoles ?? []).map((a) => a.id),
    ['initiate']
  );
  // The forbidden rite was gated only to magister; with the role gone it must
  // reopen to everyone rather than reference a role that no longer exists.
  const rite = r.traits.find((t) => t.id === 'forbidden-rite')!;
  assert.deepEqual(rite.visibleTo, []);
  assert.equal(traitVisibleTo(rite, member([])), true);
});
