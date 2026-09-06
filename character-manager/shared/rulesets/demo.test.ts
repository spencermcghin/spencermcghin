import test from 'node:test';
import assert from 'node:assert/strict';

import { demoRuleset } from './demo';
import { validateRuleset } from '../ruleset-validation';
import {
  availableTraits,
  balances,
  indexRuleset,
  traitTierCost,
  validate,
} from '../engine';
import type { Character } from '../rules-schema';

/**
 * The demo ruleset makes claims about itself in its own descriptions -- that
 * a tag reaches a cap, that a discount is real, that a quality gates a
 * purchase. Those descriptions are the first thing a new user reads, so they
 * are documentation, and untested documentation drifts.
 *
 * Each test here corresponds to a sentence someone will read in the app.
 */

const idx = indexRuleset(demoRuleset);

function character(over: Partial<Character> = {}): Character {
  return {
    id: 'c1',
    rulesetId: demoRuleset.id,
    name: 'Test',
    packageIds: [],
    traitLevels: {},
    trackPositions: {},
    qualityIds: [],
    awarded: { xp: 10, standing: 0, coin: 0 },
    fieldValues: {},
    createdAt: '',
    updatedAt: '',
    ...over,
  };
}

const optionFor = (
  c: Character,
  traitId: string,
  phase: 'creation' | 'advancement' = 'advancement'
) => availableTraits(c, idx, phase).find((o) => o.traitId === traitId)!;

test('the demo ruleset is coherent', () => {
  assert.deepEqual(validateRuleset(demoRuleset), []);
});

test('every skill sits in a group that exists, and every group is used', () => {
  // A group with nothing in it renders as an empty heading, which is the
  // first thing that makes a worked example look unfinished.
  for (const group of demoRuleset.traitGroups) {
    assert.ok(
      demoRuleset.traits.some((t) => t.groupId === group.id),
      `${group.name} has no skills in it`
    );
  }
});

test('every skill and group carries a description', () => {
  // The point of this ruleset is that reading it teaches you the editor.
  for (const trait of demoRuleset.traits) {
    assert.ok(trait.summary && trait.summary.length > 0, `${trait.name} has no summary`);
    for (const tier of trait.tiers) {
      assert.ok(
        tier.description.length > 0,
        `${trait.name} level ${tier.level} has no description`
      );
    }
  }
  for (const group of demoRuleset.traitGroups) {
    assert.ok(group.description, `${group.name} has no description`);
  }
  for (const quality of demoRuleset.qualities) {
    assert.ok(quality.description, `${quality.name} has no description`);
  }
});

/* --- the claims the descriptions make --- */

test("the Healer's reduction actually lowers a cost", () => {
  // A quarter off 2 XP is 1.5. Under halfUp that rounds back to 2 and the
  // player gets nothing, which would make the modifier invisible in the one
  // ruleset meant to demonstrate it.
  const plain = character();
  assert.equal(traitTierCost('herb-lore', 2, plain, idx)!.amount, 2);

  const healer = character({ packageIds: ['healer'] });
  assert.equal(traitTierCost('herb-lore', 2, healer, idx)!.amount, 1);
});

test('the reduction follows the tag, not the skill', () => {
  const healer = character({
    packageIds: ['healer'],
    qualityIds: ['healers-kit'],
  });
  // Both medicine skills are discounted; a skill without the tag is not.
  assert.equal(traitTierCost('first-aid', 1, healer, idx)!.amount, 1);
  assert.equal(traitTierCost('athletics', 1, healer, idx)!.amount, 1);
  assert.equal(traitTierCost('smithing', 1, healer, idx)!.amount, 2);
});

test('First Aid needs the kit, which is a quality rather than a skill', () => {
  const without = optionFor(character(), 'first-aid');
  assert.equal(without.status, 'locked');
  assert.equal(without.reason, "Requires Healer's Kit");

  const withKit = optionFor(character({ qualityIds: ['healers-kit'] }), 'first-aid');
  assert.equal(withKit.status, 'available');
});

test('First Aid 2 asks a marshal, and does not block on the answer', () => {
  const c = character({
    qualityIds: ['healers-kit'],
    traitLevels: { 'first-aid': 1 },
    awarded: { xp: 30, standing: 0, coin: 0 },
  });
  const option = optionFor(c, 'first-aid');
  assert.equal(option.status, 'available');
  assert.equal(option.checks?.length, 1);
});

test('Scout Techniques are gated by the group, not by each skill', () => {
  const anyone = character({ awarded: { xp: 30, standing: 0, coin: 0 } });
  assert.equal(optionFor(anyone, 'tracking').status, 'locked');

  const scout = character({
    packageIds: ['scout'],
    awarded: { xp: 30, standing: 0, coin: 0 },
  });
  assert.equal(optionFor(scout, 'tracking').status, 'available');

  // The skill itself states no requirement; the group carries it.
  const tracking = demoRuleset.traits.find((t) => t.id === 'tracking')!;
  assert.equal(tracking.requires, undefined);
  assert.deepEqual(tracking.tiers[0].requires, { kind: 'always' });
});

test('Pathfinding is gated on a track position', () => {
  const early = character({
    packageIds: ['scout'],
    trackPositions: { reputation: 1 },
    awarded: { xp: 30, standing: 30, coin: 0 },
  });
  const locked = optionFor(early, 'pathfinding');
  assert.equal(locked.status, 'locked');
  assert.match(locked.reason!, /Reputation 2/);

  const trusted = character({
    packageIds: ['scout'],
    trackPositions: { reputation: 2 },
    awarded: { xp: 30, standing: 30, coin: 0 },
  });
  assert.equal(optionFor(trusted, 'pathfinding').status, 'available');
});

test('the creation cap reaches crafts by tag, and lifts afterwards', () => {
  const c = character({
    traitLevels: { smithing: 1 },
    awarded: { xp: 30, standing: 0, coin: 0 },
  });

  const atCreation = optionFor(c, 'smithing', 'creation');
  assert.equal(atCreation.status, 'locked');
  assert.match(atCreation.reason!, /first level of a crafting skill/);

  assert.equal(optionFor(c, 'smithing', 'advancement').status, 'available');

  // Untagged skills are untouched by it.
  const athletics = character({
    traitLevels: { athletics: 1 },
    awarded: { xp: 30, standing: 0, coin: 0 },
  });
  assert.equal(optionFor(athletics, 'athletics', 'creation').status, 'available');
});

test('Fletching 2 needs two separate things', () => {
  const half = character({
    traitLevels: { fletching: 1, smithing: 1 },
    awarded: { xp: 30, standing: 0, coin: 0 },
  });
  const locked = optionFor(half, 'fletching');
  assert.equal(locked.status, 'locked');
  assert.match(locked.reason!, /Fletching 1 and Smithing 2/);

  const ready = character({
    traitLevels: { fletching: 1, smithing: 2 },
    awarded: { xp: 30, standing: 0, coin: 0 },
  });
  assert.equal(optionFor(ready, 'fletching').status, 'available');
});

test('a calling grants its skills free, and one of them is a choice', () => {
  // Scout costs 2 XP and hands over Tracking 1 plus Athletics 1 or Stealth 1.
  const c = character({
    packageIds: ['scout'],
    traitLevels: { tracking: 1, athletics: 1 },
  });
  assert.equal(balances(c, idx).xp, 8);
  assert.deepEqual(validate(c, idx), []);
});

/* --- the builds the seed script creates --- */

test('the three legal demo builds validate clean', () => {
  const builds: Character[] = [
    character({
      packageIds: ['healer'],
      qualityIds: ['healers-kit'],
      traitLevels: { 'herb-lore': 3, 'first-aid': 1 },
    }),
    character({
      packageIds: ['scout'],
      trackPositions: { reputation: 2 },
      traitLevels: { tracking: 1, athletics: 1, pathfinding: 1 },
      awarded: { xp: 10, standing: 16, coin: 0 },
    }),
    character({
      packageIds: ['merchant'],
      traitLevels: { haggling: 2, stealth: 1 },
      awarded: { xp: 12, standing: 0, coin: 0 },
    }),
  ];

  for (const build of builds) {
    assert.deepEqual(validate(build, idx), [], `${JSON.stringify(build.traitLevels)}`);
    for (const [currencyId, left] of Object.entries(balances(build, idx))) {
      assert.ok(left >= 0, `${build.name} overspent ${currencyId}`);
    }
  }
});

test('the deliberately illegal demo build is caught, for the stated reason', () => {
  const thorin = character({ traitLevels: { fletching: 2, smithing: 1 } });
  const violations = validate(thorin, idx);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].code, 'unmet-prerequisite');
  assert.equal(violations[0].subject, 'fletching');
});
