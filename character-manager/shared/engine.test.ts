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

/**
 * The engine, tested against the real Eldritch ruleset rather than a fixture
 * written to suit it. Every skill, cost and prerequisite named here is one a
 * player would recognise, which is what makes a passing test mean something.
 */

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

const rich = (over: Partial<Character> = {}) =>
  character({ awarded: { cp: 50, influence: 50, coin: 0 }, ...over });

const optionFor = (
  c: Character,
  traitId: string,
  phase: 'creation' | 'advancement' = 'advancement'
) => availableTraits(c, idx, phase).find((o) => o.traitId === traitId)!;

/* ---------------- compound prerequisites ---------------- */

test('Bowyer 2 needs Artificer 2 and Bowyer 1', () => {
  const short = rich({ traitLevels: { artificer: 1, bowyer: 1 } });
  const locked = optionFor(short, 'bowyer');
  assert.equal(locked.status, 'locked');
  assert.match(locked.reason!, /Artificer 2 and Bowyer 1/);

  const ready = rich({ traitLevels: { artificer: 2, bowyer: 1 } });
  assert.equal(optionFor(ready, 'bowyer').status, 'available');
});

test('Bowyer 1 is locked without Artificer 1', () => {
  const opt = optionFor(rich(), 'bowyer');
  assert.equal(opt.status, 'locked');
  assert.match(opt.reason!, /Artificer 1/);
});

/* ---------------- archetype-gated trees ---------------- */

test('Knight skills are hidden behind the Knight archetype', () => {
  const commoner = rich({ packageIds: ['commonfolk'], trackPositions: { rank: 2 } });
  const locked = optionFor(commoner, 'shield-wall');
  assert.equal(locked.status, 'locked');
  assert.match(locked.reason!, /Knight/);

  const knight = rich({
    packageIds: ['knight'],
    trackPositions: { rank: 2 },
    traitLevels: { shields: 3 },
  });
  assert.equal(optionFor(knight, 'shield-wall').status, 'available');
});

test('a signature skill needs the archetype and the rank', () => {
  const rank0 = rich({ packageIds: ['knight'], trackPositions: { rank: 0 } });
  const locked = optionFor(rank0, 'banner-of-mercy');
  assert.equal(locked.status, 'locked');
  assert.match(locked.reason!, /Rank 2/);

  const rank2 = rich({ packageIds: ['knight'], trackPositions: { rank: 2 } });
  assert.equal(optionFor(rank2, 'banner-of-mercy').status, 'available');
});

/* ---------------- "any skill of a kind" ---------------- */

test('Militiaman accepts any martial skill, not a named one', () => {
  const base = rich({ packageIds: ['veteran'], trackPositions: { rank: 1 } });
  assert.equal(optionFor(base, 'militiaman').status, 'locked');

  // Any skill in the martial tree satisfies it; the guide names none of them.
  for (const traitId of ['shields', 'archer', 'tough']) {
    const armed = rich({
      packageIds: ['veteran'],
      trackPositions: { rank: 1 },
      traitLevels: { [traitId]: 1 },
    });
    assert.equal(
      optionFor(armed, 'militiaman').status,
      'available',
      `${traitId} should satisfy "Any Martial Skill"`
    );
  }

  // A general skill does not, however many levels of it you hold.
  const scholar = rich({
    packageIds: ['veteran'],
    trackPositions: { rank: 1 },
    traitLevels: { academics: 3 },
  });
  assert.equal(optionFor(scholar, 'militiaman').status, 'locked');
});

test('a selector clause reads back as prose, not as a list of ids', () => {
  const base = rich({ packageIds: ['veteran'], trackPositions: { rank: 1 } });
  assert.match(optionFor(base, 'militiaman').reason!, /any Martial Skills skill/);
});

/* ---------------- modifiers ---------------- */

test("Gentry's 25% reduction applies to rank cost", () => {
  const plain = character({ packageIds: ['commonfolk'] });
  assert.equal(trackStepCost('rank', 1, plain, idx)!.amount, 12);

  const gentry = character({ packageIds: ['gentry'] });
  assert.equal(trackStepCost('rank', 1, gentry, idx)!.amount, 9); // 12 * 0.75
  assert.equal(trackStepCost('rank', 2, gentry, idx)!.amount, 12);
  assert.equal(trackStepCost('rank', 3, gentry, idx)!.amount, 15);
});

test('a rank modifier does not leak into trait costs', () => {
  const gentry = character({ packageIds: ['gentry'] });
  assert.equal(traitTierCost('alchemy', 1, gentry, idx)!.amount, 3);
});

test('Chemist discounts Alchemy 2 and 3, but not Alchemy 1', () => {
  // "Pay 1 less CP when purchasing Alchemy at levels 2 and 3." The community
  // planner models this as a separate skill costing -1 CP because a
  // spreadsheet cannot express a discount; here it is a modifier, and the
  // level scoping is what stops it cheapening level 1 as well.
  const plain = rich();
  assert.equal(traitTierCost('alchemy', 1, plain, idx)!.amount, 3);
  assert.equal(traitTierCost('alchemy', 2, plain, idx)!.amount, 3);

  const chemist = rich({ traitLevels: { chemist: 1, alchemy: 1 } });
  assert.equal(traitTierCost('alchemy', 1, chemist, idx)!.amount, 3);
  assert.equal(traitTierCost('alchemy', 2, chemist, idx)!.amount, 2);
  assert.equal(traitTierCost('alchemy', 3, chemist, idx)!.amount, 2);
});

/* ---------------- purchase caps ---------------- */

test('the creation caps only bind the characters they were written for', () => {
  // Three regimes by starting event. A character made for Event 7 or later is
  // subject to none of them, which is why the caps carry a `when`.
  // Apothecary grants Alchemy, so the "not granted by your archetype" cap
  // passes it over and the crafting cap is the one left -- which is the case
  // the guide spells out: capped "even if it came with your archetype".
  const held = { packageIds: ['apothecary'], traitLevels: { alchemy: 1 } };

  const early = rich({ ...held, qualityIds: ['created-before-event-5'] });
  const capped = optionFor(early, 'alchemy', 'creation');
  assert.equal(capped.status, 'locked');
  assert.match(capped.reason!, /not purchase more than level 1 of any crafting skill/);

  const midCampaign = rich({ ...held, qualityIds: ['created-event-5-to-6'] });
  assert.equal(optionFor(midCampaign, 'alchemy', 'creation').status, 'available');

  const late = rich(held);
  assert.equal(optionFor(late, 'alchemy', 'creation').status, 'available');
});

test('a cap on creation does not apply during advancement', () => {
  const c = rich({ traitLevels: { alchemy: 1 }, qualityIds: ['created-before-event-5'] });
  assert.equal(optionFor(c, 'alchemy', 'advancement').status, 'available');
});

test('a non-crafting skill is not caught by the crafting cap', () => {
  const c = rich({
    packageIds: ['apothecary'],
    traitLevels: { herbalism: 1 },
    qualityIds: ['created-before-event-5'],
  });
  // Herbalism comes with Apothecary, so the not-granted cap passes it over,
  // and it carries no crafting tag.
  assert.equal(optionFor(c, 'herbalism', 'creation').status, 'available');
});

/* ---------------- budget ---------------- */

test('package-granted trait levels are free; bought levels are not', () => {
  // Apothecary costs 4 CP and grants Alchemy 1 and Herbalism 1.
  const c = character({
    packageIds: ['apothecary'],
    traitLevels: { alchemy: 1, herbalism: 1 },
    awarded: { cp: 4, influence: 0, coin: 0 },
  });
  assert.equal(balances(c, idx).cp, 0);
  assert.deepEqual(validate(c, idx), []);

  const overreach = character({
    packageIds: ['apothecary'],
    traitLevels: { alchemy: 2, herbalism: 1 },
    awarded: { cp: 4, influence: 0, coin: 0 },
  });
  assert.equal(balances(overreach, idx).cp, -3);
  assert.ok(validate(overreach, idx).some((v) => v.code === 'overspent'));
});

test('affordability is reported separately from being locked', () => {
  const broke = character({ awarded: { cp: 0, influence: 0, coin: 0 } });
  const opt = optionFor(broke, 'academics');
  assert.equal(opt.status, 'unaffordable');
  assert.equal(opt.reason, 'Insufficient points');
});

/* ---------------- validation ---------------- */

test('validate rejects a trait whose prerequisite is missing', () => {
  const c = rich({ traitLevels: { bowyer: 1 } }); // needs Artificer 1
  assert.ok(
    validate(c, idx).some((v) => v.code === 'unmet-prerequisite' && v.subject === 'bowyer')
  );
});

test('a trait cannot satisfy its own prerequisite', () => {
  // Academics 3 held, with 1 and 2 never taken separately: each tier is
  // checked against the character as they were before that tier.
  const c = rich({ traitLevels: { academics: 3 } });
  assert.deepEqual(validate(c, idx), []);
});

test('validate rejects holding two archetypes of the same tier', () => {
  const c = rich({ packageIds: ['commonfolk', 'gentry'] });
  assert.ok(validate(c, idx).some((v) => v.code === 'package-tier-limit'));
});

test('validate rejects a trait not defined in the ruleset', () => {
  assert.ok(
    validate(character({ traitLevels: { necromancy: 1 } }), idx).some(
      (v) => v.code === 'unknown-trait'
    )
  );
});

test('an advanced archetype checks its basic-archetype prerequisite', () => {
  // "Knight: Gentry, Physician, Soldier, or Courtier."
  const wrong = rich({ packageIds: ['farmer', 'knight'] });
  assert.ok(validate(wrong, idx).some((v) => v.code === 'package-requirement'));

  const right = rich({ packageIds: ['gentry', 'knight'] });
  assert.ok(!validate(right, idx).some((v) => v.code === 'package-requirement'));
});

test('an "any except" archetype prerequisite excludes the named ones', () => {
  // "Cirque: Any except Courtier or Gentry."
  const barred = rich({ packageIds: ['gentry', 'cirque'] });
  assert.ok(validate(barred, idx).some((v) => v.code === 'package-requirement'));

  const allowed = rich({ packageIds: ['farmer', 'cirque'] });
  assert.ok(!validate(allowed, idx).some((v) => v.code === 'package-requirement'));
});

test('a legal Gentry character validates clean', () => {
  // Gentry costs 4 CP and grants a choice of Academics or Espionage, and a
  // choice of Income or Influential.
  const c = character({
    packageIds: ['gentry'],
    traitLevels: { academics: 1, income: 1 },
    awarded: { cp: 4, influence: 0, coin: 0 },
  });
  assert.deepEqual(validate(c, idx), []);
});

/* ---------------- qualities ---------------- */

test('Disable Device is locked until the character has a lockpicking kit', () => {
  const without = optionFor(rich(), 'disable-device');
  assert.equal(without.status, 'locked');
  assert.equal(without.reason, 'Requires Lockpicking Kit');

  const withKit = rich({ qualityIds: ['lockpicking-kit'] });
  assert.equal(optionFor(withKit, 'disable-device').status, 'available');
});

test('Gunsmith needs a background staff agreed to', () => {
  const c = rich({ traitLevels: { artificer: 1 } });
  assert.equal(optionFor(c, 'gunsmith').status, 'locked');

  const dusklander = rich({
    traitLevels: { artificer: 1 },
    qualityIds: ['dusklander'],
  });
  assert.equal(optionFor(dusklander, 'gunsmith').status, 'available');
});

test('a character stored before qualities existed does not crash the engine', () => {
  const legacy = rich();
  delete (legacy as Partial<Character>).qualityIds;
  assert.equal(optionFor(legacy, 'disable-device').status, 'locked');
});

test('a character holding a quality the ruleset dropped is reported', () => {
  const c = character({ qualityIds: ['a-kit-that-was-deleted'] });
  assert.ok(validate(c, idx).some((v) => v.code === 'unknown-quality'));
});

/* ---------------- checks only a person can make ---------------- */

test('a lore skill is free, and asks staff for the props instead', () => {
  // "There is no CP cost for the lore skill when you find a Syllabus."
  const option = optionFor(rich(), 'history');
  assert.equal(option.cost?.amount, 0);
  assert.equal(option.status, 'available');
  assert.equal(option.checks?.length, 1);
  assert.match(option.checks![0], /Syllabus/);
});

test('levelling a lore skill asks for the right number of props', () => {
  const c = rich({ traitLevels: { history: 1 } });
  const option = optionFor(c, 'history');
  assert.equal(option.nextLevel, 2);
  assert.equal(option.status, 'available');
  assert.match(option.checks![0], /Redeem 6 unique History - 1 lore props/);
});

test('outstanding checks on a held skill are listed for staff', () => {
  const c = rich({ traitLevels: { history: 2 } });
  const checks = pendingChecks(c, idx);
  assert.equal(checks.length, 2);
  assert.deepEqual(
    checks.map((x) => x.subject),
    ['History 1', 'History 2']
  );
});

test('a manual clause under "any" is not presented as a requirement', () => {
  assert.deepEqual(
    manualChecks({
      kind: 'any',
      of: [{ kind: 'always' }, { kind: 'manual', text: 'Staff approval' }],
    }),
    []
  );
});
