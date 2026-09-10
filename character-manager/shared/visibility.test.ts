import test from 'node:test';
import assert from 'node:assert/strict';

import type { Ruleset, Trait } from './rules-schema';
import { emptyRuleset, stripAccessRole } from './ruleset-editor';
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

test('gate ids the project does not define are ignored', () => {
  const t = trait('rite', ['magister', 'ghost']);
  const ctx = { isStaff: false, roleIds: ['magister'], definedRoleIds: ['magister'] };
  assert.equal(traitVisibleTo(t, ctx), true);
  // Without the role, the surviving gate entry still binds.
  assert.equal(
    traitVisibleTo(t, { ...ctx, roleIds: [] }),
    false
  );
});

test('a gate naming only unknown roles is void, and the skill visible', () => {
  // The imported-ruleset case: gates from another group's roles must not
  // lock a skill to nobody.
  const t = trait('rite', ['someone-elses-role']);
  assert.equal(
    traitVisibleTo(t, { isStaff: false, roleIds: [], definedRoleIds: ['magister'] }),
    true
  );
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
  assert.deepEqual(activeRoleIds(['magister'], ['magister', 'ghost']), ['magister']);
  assert.deepEqual(activeRoleIds([], ['magister']), []);
});

test('stripAccessRole removes the id from every gate and nothing else', () => {
  const r = stripAccessRole(fixture(), 'magister');
  const rite = r.traits.find((t) => t.id === 'forbidden-rite')!;
  assert.deepEqual(rite.visibleTo, []);
  assert.equal(traitVisibleTo(rite, member([])), true);
  // Skills that never named the role are untouched.
  assert.deepEqual(r.traits.find((t) => t.id === 'swordplay'), trait('swordplay'));
});
