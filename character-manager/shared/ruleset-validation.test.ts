import test from 'node:test';
import assert from 'node:assert/strict';

import { eldritch } from './rulesets/eldritch';
import { findCycles, prerequisiteGraph, validateRuleset } from './ruleset-validation';
import { normalizeRuleset } from './normalize';
import type { Ruleset, Trait } from './rules-schema';

/** A minimal but valid ruleset to mutate per test. */
function base(): Ruleset {
  return {
    id: 'test',
    name: 'Test',
    version: '1',
    startingBudget: [{ currencyId: 'cp', amount: 10 }],
    currencies: [{ id: 'cp', name: 'Points', kind: 'progression' }],
    packageTiers: [{ id: 'basic', name: 'Basic', maxHeld: 1 }],
    packageAttributes: [],
    traitAttributes: [],
    qualities: [],
    packages: [],
    traitGroups: [{ id: 'general', name: 'General' }],
    traits: [],
    tracks: [],
    purchaseRules: [],
    sheet: [],
  };
}

function trait(id: string, requires: Trait['tiers'][number]['requires']): Trait {
  return {
    id,
    name: id,
    groupId: 'general',
    tags: [],
    tiers: [
      {
        level: 1,
        description: '',
        cost: { currencyId: 'cp', amount: 1 },
        requires,
        grants: [],
      },
    ],
  };
}

const codes = (r: Ruleset) => validateRuleset(r).map((i) => i.code);

/* ---------------- the real ruleset ---------------- */

test('Eldritch validates clean', () => {
  assert.deepEqual(validateRuleset(eldritch), []);
});

/* ---------------- cycles ---------------- */

test('a normal tier ladder is not a cycle', () => {
  // Academics 2 requires Academics 1. Self-dependency is how every ladder
  // works and must never be reported.
  const graph = prerequisiteGraph(eldritch);
  assert.equal(graph.get('academics')?.has('academics'), false);
  assert.deepEqual(findCycles(graph), []);
});

test('two skills requiring each other are reported', () => {
  const r = base();
  r.traits = [
    trait('alpha', { kind: 'trait', traitId: 'beta', minLevel: 1 }),
    trait('beta', { kind: 'trait', traitId: 'alpha', minLevel: 1 }),
  ];
  const issues = validateRuleset(r);
  const cycle = issues.find((i) => i.code === 'prerequisite-cycle');
  assert.ok(cycle, 'expected a prerequisite-cycle issue');
  assert.match(cycle.message, /alpha/);
  assert.match(cycle.message, /beta/);
});

test('a longer loop is reported once, not once per member', () => {
  const r = base();
  r.traits = [
    trait('a', { kind: 'trait', traitId: 'b', minLevel: 1 }),
    trait('b', { kind: 'trait', traitId: 'c', minLevel: 1 }),
    trait('c', { kind: 'trait', traitId: 'a', minLevel: 1 }),
  ];
  assert.equal(codes(r).filter((c) => c === 'prerequisite-cycle').length, 1);
});

test('a cycle hidden inside a compound condition is still found', () => {
  const r = base();
  r.traits = [
    trait('alpha', {
      kind: 'all',
      of: [
        { kind: 'always' },
        { kind: 'any', of: [{ kind: 'trait', traitId: 'beta', minLevel: 2 }] },
      ],
    }),
    trait('beta', { kind: 'trait', traitId: 'alpha', minLevel: 1 }),
  ];
  assert.ok(codes(r).includes('prerequisite-cycle'));
});

test('a diamond dependency is not a cycle', () => {
  const r = base();
  r.traits = [
    trait('root', { kind: 'always' }),
    trait('left', { kind: 'trait', traitId: 'root', minLevel: 1 }),
    trait('right', { kind: 'trait', traitId: 'root', minLevel: 1 }),
    trait('tip', {
      kind: 'all',
      of: [
        { kind: 'trait', traitId: 'left', minLevel: 1 },
        { kind: 'trait', traitId: 'right', minLevel: 1 },
      ],
    }),
  ];
  assert.deepEqual(validateRuleset(r), []);
});

/* ---------------- dangling references ---------------- */

test('a prerequisite on a deleted skill is reported', () => {
  const r = base();
  r.traits = [trait('alpha', { kind: 'trait', traitId: 'ghost', minLevel: 1 })];
  const issue = validateRuleset(r).find((i) => i.code === 'dangling-reference');
  assert.ok(issue);
  assert.match(issue.message, /ghost/);
});

test('a skill in a missing group is reported', () => {
  const r = base();
  const t = trait('alpha', { kind: 'always' });
  t.groupId = 'nowhere';
  r.traits = [t];
  assert.ok(codes(r).includes('dangling-reference'));
});

test('a cost in a currency that does not exist is reported', () => {
  const r = base();
  const t = trait('alpha', { kind: 'always' });
  t.tiers[0].cost = { currencyId: 'gold', amount: 1 };
  r.traits = [t];
  const issue = validateRuleset(r).find((i) => i.code === 'dangling-reference');
  assert.match(issue!.message, /gold/);
});

test('an archetype gate on a deleted archetype is reported', () => {
  const r = base();
  r.traitGroups = [
    { id: 'general', name: 'General' },
    {
      id: 'knightly',
      name: 'Knightly',
      requires: { kind: 'package', packageId: 'knight' },
    },
  ];
  assert.ok(codes(r).includes('dangling-reference'));
});

/* ---------------- structural ---------------- */

test('a gap in tier levels is reported', () => {
  const r = base();
  const t = trait('alpha', { kind: 'always' });
  t.tiers.push({
    level: 3, // 2 is missing
    description: '',
    cost: { currencyId: 'cp', amount: 1 },
    requires: { kind: 'always' },
    grants: [],
  });
  r.traits = [t];
  const issue = validateRuleset(r).find((i) => i.code === 'tier-sequence');
  assert.ok(issue);
  assert.match(issue.message, /1, 3/);
});

test('a skill with no levels is reported', () => {
  const r = base();
  const t = trait('alpha', { kind: 'always' });
  t.tiers = [];
  r.traits = [t];
  assert.ok(codes(r).includes('empty-trait'));
});

test('duplicate ids are reported', () => {
  const r = base();
  r.traits = [trait('alpha', { kind: 'always' }), trait('alpha', { kind: 'always' })];
  assert.ok(codes(r).includes('duplicate-id'));
});

test('groups nested in a loop are reported', () => {
  const r = base();
  r.traitGroups = [
    { id: 'a', name: 'A', parentId: 'b' },
    { id: 'b', name: 'B', parentId: 'a' },
    { id: 'general', name: 'General' },
  ];
  assert.ok(codes(r).includes('group-cycle'));
});

test('a cap targeting a deleted group warns rather than errors', () => {
  const r = base();
  r.purchaseRules = [
    {
      id: 'cap',
      label: 'Cap',
      message: 'capped',
      phase: 'both',
      appliesTo: { groupId: 'ghost' },
      maxLevel: 1,
    },
  ];
  const issue = validateRuleset(r).find((i) => i.code === 'dangling-reference');
  assert.equal(issue?.severity, 'warning');
});

/* ---------------- scale ---------------- */

test('a deep dependency chain does not exhaust the stack', () => {
  // The traversal is iterative for exactly this reason; a recursive one
  // overflows here.
  const r = base();
  const N = 20000;
  r.traits = Array.from({ length: N }, (_, i) =>
    trait(
      `t${i}`,
      i === 0 ? { kind: 'always' } : { kind: 'trait', traitId: `t${i - 1}`, minLevel: 1 }
    )
  );
  assert.deepEqual(validateRuleset(r), []);
});

/* ---------------- documents written before a field existed ---------------- */

test('a ruleset stored before a field was added does not crash the validator', () => {
  // Exactly what happened: a copy of Eldritch persisted before
  // traitAttributes existed, read back, and validated.
  const legacy = { ...eldritch } as Record<string, unknown>;
  delete legacy.traitAttributes;
  assert.doesNotThrow(() => validateRuleset(legacy as unknown as Ruleset));

  const issues = validateRuleset(legacy as unknown as Ruleset);
  // Nothing is broken -- but values whose declaration went missing are
  // reported, which is how an author learns the document needs the field back
  // rather than quietly losing the data.
  assert.equal(issues.filter((i) => i.severity === 'error').length, 0);
  assert.ok(issues.every((i) => i.code === 'undeclared-attribute'));
});

test('every array field can be missing at once', () => {
  const bare = { id: 'x', name: 'X', version: '1' } as unknown as Ruleset;
  assert.doesNotThrow(() => validateRuleset(bare));
});

test('normalizing keeps values it does not recognise', () => {
  // Discarding an unknown field would destroy data written by a newer version.
  const withExtra = { ...eldritch, futureField: 42 } as unknown as Ruleset;
  const out = normalizeRuleset(withExtra) as unknown as Record<string, unknown>;
  assert.equal(out.futureField, 42);
  assert.deepEqual(out.traits, eldritch.traits);
});

/* ---------------- qualities and manual checks ---------------- */

test('requiring a quality that does not exist is a dangling reference', () => {
  const r = base();
  r.traits = [trait('picking', { kind: 'quality', qualityId: 'no-such-kit' })];
  const issues = validateRuleset(r);
  assert.ok(
    issues.some(
      (i) => i.code === 'dangling-reference' && /quality "no-such-kit"/.test(i.message)
    )
  );
});

test('a declared quality satisfies the reference', () => {
  const r = base();
  r.qualities = [{ id: 'kit', name: 'Kit', grantedBy: 'player' }];
  r.traits = [trait('picking', { kind: 'quality', qualityId: 'kit' })];
  assert.deepEqual(validateRuleset(r), []);
});

test('a manual check with nothing written in it warns', () => {
  const r = base();
  r.traits = [trait('picking', { kind: 'manual', text: '   ' })];
  const issues = validateRuleset(r);
  assert.ok(issues.some((i) => i.code === 'empty-check' && i.severity === 'warning'));
  assert.equal(issues.filter((i) => i.severity === 'error').length, 0);
});

test('a manual check that says something does not warn', () => {
  const r = base();
  r.traits = [trait('picking', { kind: 'manual', text: 'Staff must approve.' })];
  assert.deepEqual(validateRuleset(r), []);
});

test('duplicate quality ids are reported', () => {
  const r = base();
  r.qualities = [
    { id: 'kit', name: 'Kit', grantedBy: 'player' },
    { id: 'kit', name: 'Another Kit', grantedBy: 'staff' },
  ];
  assert.ok(
    validateRuleset(r).some(
      (i) => i.code === 'duplicate-id' && i.subject?.kind === 'quality'
    )
  );
});

test('a ruleset stored before qualities existed validates', () => {
  const legacy = { ...eldritch } as Record<string, unknown>;
  delete legacy.qualities;
  const issues = validateRuleset(legacy as unknown as Ruleset);
  // The rules that needed the qualities now point at nothing, which is
  // exactly what the author needs told.
  assert.ok(issues.some((i) => i.code === 'dangling-reference'));
  assert.doesNotThrow(() => validateRuleset(legacy as unknown as Ruleset));
});
