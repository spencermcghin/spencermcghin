import test from 'node:test';
import assert from 'node:assert/strict';

import { eldritch } from './rulesets/eldritch';
import {
  availableTraits,
  balances,
  indexRuleset,
  manualChecks,
  pendingChecks,
  trackStepCost,
  traitTierCost,
  validate,
} from './engine';
import type { Character } from './rules-schema';

const idx = indexRuleset(eldritch);

function character(over: Partial<Character> = {}): Character {
  return {
    id: 'c1',
    rulesetId: 'eldritch',
    name: 'Test',
    packageIds: [],
    traitLevels: {},
    trackPositions: {},
    qualityIds: [],
    awarded: { cp: 4, influence: 0, coin: 0 },
    fieldValues: {},
    createdAt: '',
    updatedAt: '',
    ...over,
  };
}

const optionFor = (c: Character, traitId: string, phase: 'creation' | 'advancement' = 'advancement') =>
  availableTraits(c, idx, phase).find((o) => o.traitId === traitId)!;

/* ---------------- compound prerequisites ---------------- */

test('Bowyer 2 needs Artificer 2 AND Bowyer 1', () => {
  // Has Bowyer 1 and Artificer 1 -- Artificer is one level short.
  const short = character({
    traitLevels: { artificer: 1, bowyer: 1 },
    awarded: { cp: 50, influence: 0, coin: 0 },
  });
  const locked = optionFor(short, 'bowyer');
  assert.equal(locked.status, 'locked');
  assert.match(locked.reason!, /Artificer 2 and Bowyer 1/);

  const ready = character({
    traitLevels: { artificer: 2, bowyer: 1 },
    awarded: { cp: 50, influence: 0, coin: 0 },
  });
  assert.equal(optionFor(ready, 'bowyer').status, 'available');
});

test('Bowyer 1 is locked without Artificer 1', () => {
  const c = character({ awarded: { cp: 50, influence: 0, coin: 0 } });
  const opt = optionFor(c, 'bowyer');
  assert.equal(opt.status, 'locked');
  assert.match(opt.reason!, /Artificer 1/);
});

/* ---------------- archetype-gated trees ---------------- */

test('Knight skills are hidden behind the Knight archetype', () => {
  const commoner = character({
    packageIds: ['commonfolk'],
    awarded: { cp: 50, influence: 0, coin: 0 },
  });
  const locked = optionFor(commoner, 'shield-wall');
  assert.equal(locked.status, 'locked');
  assert.match(locked.reason!, /Knight/);

  const knight = character({
    packageIds: ['knight'],
    awarded: { cp: 50, influence: 0, coin: 0 },
  });
  assert.equal(optionFor(knight, 'shield-wall').status, 'available');
});

test('a signature skill needs both the archetype and the rank', () => {
  const rank0 = character({
    packageIds: ['knight'],
    trackPositions: { rank: 0 },
    awarded: { cp: 50, influence: 0, coin: 0 },
  });
  const locked = optionFor(rank0, 'banner-of-mercy');
  assert.equal(locked.status, 'locked');
  assert.match(locked.reason!, /Rank 2/);

  const rank2 = character({
    packageIds: ['knight'],
    trackPositions: { rank: 2 },
    awarded: { cp: 50, influence: 50, coin: 0 },
  });
  assert.equal(optionFor(rank2, 'banner-of-mercy').status, 'available');
});

/* ---------------- modifiers ---------------- */

test("Gentry's 25% reduction applies to rank cost", () => {
  const plain = character({ packageIds: ['commonfolk'] });
  assert.equal(trackStepCost('rank', 1, plain, idx)!.amount, 12);

  const gentry = character({ packageIds: ['gentry'] });
  assert.equal(trackStepCost('rank', 1, gentry, idx)!.amount, 9); // 12 * 0.75

  // 16 * 0.75 = 12 exactly; 20 * 0.75 = 15.
  assert.equal(trackStepCost('rank', 2, gentry, idx)!.amount, 12);
  assert.equal(trackStepCost('rank', 3, gentry, idx)!.amount, 15);
});

test('a rank modifier does not leak into trait costs', () => {
  const gentry = character({ packageIds: ['gentry'] });
  assert.equal(traitTierCost('alchemy', 1, gentry, idx)!.amount, 3);
});

/* ---------------- purchase caps by phase ---------------- */

test('crafting is capped at level 1 during creation but not after', () => {
  const c = character({
    traitLevels: { alchemy: 1 },
    awarded: { cp: 50, influence: 0, coin: 0 },
  });

  const atCreation = optionFor(c, 'alchemy', 'creation');
  assert.equal(atCreation.status, 'locked');
  assert.match(atCreation.reason!, /crafting skill at character creation/);

  assert.equal(optionFor(c, 'alchemy', 'advancement').status, 'available');
});

test('a non-crafting skill is not caught by the crafting cap', () => {
  const c = character({
    packageIds: ['apothecary'],
    traitLevels: { herbalism: 1 },
    awarded: { cp: 50, influence: 0, coin: 0 },
  });
  // herbalism is granted by Apothecary, so the not-granted cap does not apply
  assert.equal(optionFor(c, 'herbalism', 'creation').status, 'available');
});

/* ---------------- budget ---------------- */

test('package-granted trait levels are free; bought levels are not', () => {
  // Apothecary costs 4 CP and grants Alchemy 1 + Herbalism 1 free.
  const c = character({
    packageIds: ['apothecary'],
    traitLevels: { alchemy: 1, herbalism: 1 },
    awarded: { cp: 4, influence: 0, coin: 0 },
  });
  assert.equal(balances(c, idx).cp, 0);
  assert.deepEqual(validate(c, idx), []);

  // Taking Alchemy to 2 costs 3 more CP, which this character cannot afford.
  const overreach = character({
    packageIds: ['apothecary'],
    traitLevels: { alchemy: 2, herbalism: 1 },
    awarded: { cp: 4, influence: 0, coin: 0 },
  });
  assert.equal(balances(overreach, idx).cp, -3);
  const codes = validate(overreach, idx).map((v) => v.code);
  assert.ok(codes.includes('overspent'));
});

test('affordability is reported separately from being locked', () => {
  // Prerequisites met, but no points left.
  const broke = character({
    traitLevels: { artificer: 1 },
    awarded: { cp: 3, influence: 0, coin: 0 },
  });
  assert.equal(balances(broke, idx).cp, 0);
  const opt = optionFor(broke, 'academics');
  assert.equal(opt.status, 'unaffordable');
  assert.equal(opt.reason, 'Insufficient points');
});

/* ---------------- validation ---------------- */

test('validate rejects a trait whose prerequisite is missing', () => {
  const c = character({
    traitLevels: { bowyer: 1 }, // requires Artificer 1
    awarded: { cp: 50, influence: 0, coin: 0 },
  });
  const v = validate(c, idx);
  assert.ok(v.some((x) => x.code === 'unmet-prerequisite' && x.subject === 'bowyer'));
});

test('a trait cannot satisfy its own prerequisite', () => {
  // Academics 3 held, but 1 and 2 were never taken -- traitLevels records a
  // single number, so the engine must check each tier against the character
  // as they were before that tier.
  const c = character({
    traitLevels: { academics: 3 },
    awarded: { cp: 50, influence: 0, coin: 0 },
  });
  assert.deepEqual(validate(c, idx), []); // levels 1..3 taken in order is legal
});

test('validate rejects holding two packages of the same tier', () => {
  const c = character({
    packageIds: ['commonfolk', 'gentry'],
    awarded: { cp: 50, influence: 0, coin: 0 },
  });
  assert.ok(validate(c, idx).some((v) => v.code === 'package-tier-limit'));
});

test('validate rejects a trait not defined in the ruleset', () => {
  const c = character({ traitLevels: { necromancy: 1 } });
  assert.ok(validate(c, idx).some((v) => v.code === 'unknown-trait'));
});

test('a legal Gentry character validates clean', () => {
  // Gentry costs 4 CP and grants Academics 1 and Income 1 via choices.
  const c = character({
    packageIds: ['gentry'],
    traitLevels: { academics: 1, income: 1 },
    awarded: { cp: 4, influence: 0, coin: 0 },
  });
  assert.deepEqual(validate(c, idx), []);
});

/* ---------------- qualities and manual checks ---------------- */

test('a skill gated on a quality is locked until the character has it', () => {
  const without = optionFor(character({}), 'lockpicking');
  assert.equal(without.status, 'locked');
  assert.equal(without.reason, 'Requires Lockpicking Kit');

  const withKit = optionFor(character({ qualityIds: ['lockpicking-kit'] }), 'lockpicking');
  assert.equal(withKit.status, 'available');
});

test('a character stored before qualities existed does not crash the engine', () => {
  // qualityIds is required on Character now, but a document written earlier
  // simply does not have it, and reading one must not throw.
  const legacy = character({});
  delete (legacy as Partial<Character>).qualityIds;
  assert.equal(optionFor(legacy, 'lockpicking').status, 'locked');
});

test('a manual check does not block the purchase, but is reported', () => {
  const c = character({
    qualityIds: ['lockpicking-kit'],
    traitLevels: { lockpicking: 1 },
    awarded: { cp: 50, influence: 0, coin: 0 },
  });
  const option = optionFor(c, 'lockpicking');

  // Locking it would make the skill unbuyable for everyone forever, since
  // nothing the engine can see will ever satisfy it.
  assert.equal(option.status, 'available');
  assert.equal(option.nextLevel, 2);
  assert.deepEqual(option.checks, [
    'Staff must watch you open a practice lock at check-in.',
  ]);
});

test('a skill with nothing to check carries no checks', () => {
  const option = optionFor(character({ qualityIds: ['lockpicking-kit'] }), 'lockpicking');
  assert.equal(option.checks, undefined);
});

test('manual checks on what a character already holds are listed for staff', () => {
  const c = character({
    qualityIds: ['lockpicking-kit'],
    traitLevels: { lockpicking: 2 },
    awarded: { cp: 50, influence: 0, coin: 0 },
  });
  assert.deepEqual(pendingChecks(c, idx), [
    {
      subject: 'Lockpicking 2',
      text: 'Staff must watch you open a practice lock at check-in.',
    },
  ]);
});

test('a level not yet taken contributes no outstanding check', () => {
  const c = character({
    qualityIds: ['lockpicking-kit'],
    traitLevels: { lockpicking: 1 },
    awarded: { cp: 50, influence: 0, coin: 0 },
  });
  assert.deepEqual(pendingChecks(c, idx), []);
});

test('a manual clause under "any" is not presented as a requirement', () => {
  // The sibling clause may already satisfy it, so sending staff after it
  // would be chasing a requirement that does not apply.
  assert.deepEqual(
    manualChecks({
      kind: 'any',
      of: [
        { kind: 'always' },
        { kind: 'manual', text: 'Staff approval' },
      ],
    }),
    []
  );
});

test('a character holding a quality the ruleset dropped is reported', () => {
  const c = character({ qualityIds: ['a-kit-that-was-deleted'] });
  assert.ok(validate(c, idx).some((v) => v.code === 'unknown-quality'));
});

test('a character with a legitimate quality validates clean', () => {
  const c = character({
    qualityIds: ['lockpicking-kit'],
    traitLevels: { lockpicking: 1 },
    awarded: { cp: 4, influence: 0, coin: 0 },
  });
  assert.deepEqual(validate(c, idx), []);
});
