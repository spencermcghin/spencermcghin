import test from 'node:test';
import assert from 'node:assert/strict';

import { eldritch } from './rulesets/eldritch';
import { validateRuleset } from './ruleset-validation';
import * as edit from './ruleset-editor';
import type { Ruleset } from './rules-schema';

/**
 * Acceptance test for the designer.
 *
 * The question this answers is not "does the schema describe Eldritch" -- the
 * fixture already shows that -- but "could someone sitting in front of the
 * builder produce Eldritch by hand". So this rebuilds it from an empty
 * ruleset using only the editing operations the UI will call, then asserts
 * the result is indistinguishable from the fixture.
 *
 * Anything Eldritch needs that cannot be expressed here is a missing feature
 * in the designer, and this test is where that surfaces.
 *
 * Skills are built the way a person would: create the skill, then add each
 * level -- rather than handing over a finished object in one call.
 */
function buildEldritchThroughTheEditor(): Ruleset {
  let r = edit.emptyRuleset('eldritch', 'Eldritch');

  r = edit.setMeta(r, {
    version: '2026',
    description:
      'A live action roleplaying game set in the Kingdom of Arnesse. Events take place in the Annwyn.',
  });

  /* --- currencies: two progression axes plus an economy --- */
  r = edit.addCurrency(r, {
    id: 'cp',
    name: 'Character Point',
    abbreviation: 'CP',
    kind: 'progression',
  });
  r = edit.addCurrency(r, { id: 'influence', name: 'Influence', kind: 'progression' });
  r = edit.addCurrency(r, {
    id: 'coin',
    name: 'Silver Dragon',
    abbreviation: 'sd',
    kind: 'economy',
  });
  r = edit.setStartingBudget(r, [{ currencyId: 'cp', amount: 4 }]);

  /* --- archetype tiers and the display-only card fields --- */
  r = edit.addPackageTier(r, { id: 'basic', name: 'Basic Archetype', maxHeld: 1 });
  r = edit.addPackageTier(r, { id: 'advanced', name: 'Advanced Archetype', maxHeld: 1 });
  for (const [key, label] of [
    ['startingEquipment', 'Starting Equipment'],
    ['retainerBenefit', 'Retainer Benefit'],
    ['salary', 'Salary'],
  ] as const) {
    r = edit.addPackageAttribute(r, { key, label });
  }

  /* --- archetypes --- */

  // Commonfolk: an open-ended pick of any level 1 skill.
  r = edit.addPackage(r, {
    id: 'commonfolk',
    name: 'Commonfolk',
    tier: 'basic',
    cost: { currencyId: 'cp', amount: 1 },
    requires: { kind: 'always' },
    grants: [],
    attributes: {
      startingEquipment: '20 resources of your choice',
      retainerBenefit: '8 Silver Dragons',
      salary: '3 Silver Dragons',
    },
  });
  r = edit.addPackageGrant(r, 'commonfolk', {
    kind: 'currency',
    currencyId: 'coin',
    amount: 20,
  });
  r = edit.addPackageGrant(r, 'commonfolk', {
    kind: 'traitChoice',
    count: 1,
    level: 1,
    matching: { kind: 'always' },
  });
  r = edit.addPackageGrant(r, 'commonfolk', {
    kind: 'note',
    text: '20 resources of your choice',
  });

  r = edit.addPackage(r, {
    id: 'apothecary',
    name: 'Apothecary',
    tier: 'basic',
    cost: { currencyId: 'cp', amount: 4 },
    requires: { kind: 'always' },
    grants: [
      { kind: 'trait', traitId: 'alchemy', level: 1 },
      { kind: 'trait', traitId: 'herbalism', level: 1 },
    ],
    attributes: {
      startingEquipment:
        '2 Apothecary Kits, 4 level 1 apothecary schematics, and resources to craft two',
      retainerBenefit: '8 Common Herbs',
      salary: '3 silver dragons',
    },
  });

  // Artificer: the "A or B" choice grant.
  r = edit.addPackage(r, {
    id: 'artificer-archetype',
    name: 'Artificer',
    tier: 'basic',
    cost: { currencyId: 'cp', amount: 4 },
    requires: { kind: 'always' },
    grants: [
      { kind: 'trait', traitId: 'artificer', level: 1 },
      {
        kind: 'choice',
        pick: 1,
        from: [
          { kind: 'trait', traitId: 'hunting', level: 1 },
          { kind: 'trait', traitId: 'farming', level: 1 },
        ],
      },
    ],
    attributes: {
      startingEquipment: '2 Artificer Kits, 4 level 1 artificer schematics',
      retainerBenefit: '8 Cloth OR 8 Leather',
      salary: '3 silver dragons',
    },
    notes: 'Retained by Cirque only',
  });

  // Gentry: two choices plus a stacking cost modifier on another subsystem.
  r = edit.addPackage(r, {
    id: 'gentry',
    name: 'Gentry',
    tier: 'basic',
    cost: { currencyId: 'cp', amount: 4 },
    requires: { kind: 'always' },
    grants: [
      { kind: 'currency', currencyId: 'coin', amount: 60 },
      {
        kind: 'choice',
        pick: 1,
        from: [
          { kind: 'trait', traitId: 'academics', level: 1 },
          { kind: 'trait', traitId: 'espionage', level: 1 },
        ],
      },
      {
        kind: 'choice',
        pick: 1,
        from: [
          { kind: 'trait', traitId: 'income', level: 1 },
          { kind: 'trait', traitId: 'influential', level: 1 },
        ],
      },
      {
        kind: 'modifier',
        modifier: {
          id: 'gentry-rank-discount',
          label: 'Gentry rank reduction',
          target: { kind: 'trackStepCost', trackId: 'rank' },
          operation: 'percentReduction',
          value: 25,
          stacking: 'successive',
          rounding: 'halfUp',
        },
      },
    ],
    attributes: {
      startingEquipment: 'None',
      retainerBenefit: '2 Influence',
      salary: '4 silver dragons',
    },
  });

  r = edit.addPackage(r, {
    id: 'knight',
    name: 'Knight',
    tier: 'advanced',
    cost: { currencyId: 'cp', amount: 4 },
    requires: { kind: 'always' },
    grants: [{ kind: 'note', text: 'Begins at Rank 0.' }],
    attributes: {
      startingEquipment: 'None',
      retainerBenefit: 'None',
      salary: 'None',
    },
    notes: 'Grants access to the Knight skill tree.',
  });

  /* --- trees, including one gated on holding an archetype --- */
  r = edit.addGroup(r, {
    id: 'general',
    name: 'General Skills',
    description: 'Purchasable by any character.',
  });
  r = edit.addGroup(r, { id: 'martial', name: 'Martial Skills' });
  r = edit.addGroup(r, {
    id: 'knight-tree',
    name: 'Knight Skills',
    description: 'Available only to characters holding the Knight archetype.',
    requires: { kind: 'package', packageId: 'knight' },
  });

  /* --- skills --- */

  /** Create the skill, then add levels one at a time, as a person would. */
  const ladder = (
    id: string,
    name: string,
    groupId: string,
    cost: number,
    tags: string[] = [],
    descriptions?: string[]
  ) => {
    r = edit.addTrait(r, { id, name, groupId, tags, tiers: [] });
    for (const level of [1, 2, 3]) {
      r = edit.addTier(r, id, {
        level,
        description: descriptions?.[level - 1] ?? `${name} level ${level}.`,
        cost: { currencyId: 'cp', amount: cost },
        requires:
          level === 1
            ? { kind: 'always' }
            : { kind: 'trait', traitId: id, minLevel: level - 1 },
        grants: [],
      });
    }
  };

  ladder('academics', 'Academics', 'general', 1, [], [
    'Can read and write. Access lore noted as level 1.',
    'Access lore noted as level 2.',
    'Access lore noted as level 3.',
  ]);
  ladder('alchemy', 'Alchemy', 'general', 3, ['crafting']);
  ladder('artificer', 'Artificer', 'general', 3, ['crafting']);
  ladder('herbalism', 'Herbalism', 'general', 1);
  ladder('hunting', 'Hunting', 'general', 1);
  ladder('farming', 'Farming', 'general', 1);
  ladder('income', 'Income', 'general', 1);
  ladder('influential', 'Influential', 'general', 1);
  ladder('espionage', 'Espionage', 'general', 1);
  ladder('one-hand-weapon', '1-Hand Weapon', 'martial', 2);

  // Bowyer: per-level costs that differ from the ladder default, and the
  // compound prerequisite that makes this ruleset interesting.
  r = edit.addTrait(r, {
    id: 'bowyer',
    name: 'Bowyer',
    groupId: 'general',
    tags: ['crafting'],
    tiers: [],
  });
  r = edit.addTier(r, 'bowyer', {
    level: 1,
    description: 'Can make bows and arrows, and repair bows.',
    cost: { currencyId: 'cp', amount: 1 },
    requires: { kind: 'trait', traitId: 'artificer', minLevel: 1 },
    grants: [],
  });
  r = edit.addTier(r, 'bowyer', {
    level: 2,
    description: 'Can make improved bows.',
    cost: { currencyId: 'cp', amount: 1 },
    requires: {
      kind: 'all',
      of: [
        { kind: 'trait', traitId: 'artificer', minLevel: 2 },
        { kind: 'trait', traitId: 'bowyer', minLevel: 1 },
      ],
    },
    grants: [],
  });
  r = edit.addTier(r, 'bowyer', {
    level: 3,
    description: 'Can make masterwork bows.',
    cost: { currencyId: 'cp', amount: 1 },
    requires: {
      kind: 'all',
      of: [
        { kind: 'trait', traitId: 'artificer', minLevel: 3 },
        { kind: 'trait', traitId: 'bowyer', minLevel: 2 },
      ],
    },
    grants: [],
  });

  // Signature skill: gated by its tree on the archetype, and by its tier on
  // a position in a separate progression track.
  r = edit.addTrait(r, {
    id: 'banner-of-mercy',
    name: 'Banner of Mercy',
    groupId: 'knight-tree',
    tags: ['signature'],
    tiers: [],
  });
  r = edit.addTier(r, 'banner-of-mercy', {
    level: 1,
    description: '25% reduction in time for healing roleplay.',
    cost: { currencyId: 'cp', amount: 2 },
    requires: { kind: 'track', trackId: 'rank', minStep: 2 },
    grants: [],
  });

  r = edit.addTrait(r, {
    id: 'shield-wall',
    name: 'Shield Wall',
    groupId: 'knight-tree',
    tags: [],
    tiers: [],
  });
  r = edit.addTier(r, 'shield-wall', {
    level: 1,
    description: 'Hold the line alongside an adjacent ally.',
    cost: { currencyId: 'cp', amount: 2 },
    requires: { kind: 'always' },
    grants: [],
  });

  /* --- the second progression axis --- */
  r = edit.addTrack(r, {
    id: 'rank',
    name: 'Rank',
    currencyId: 'influence',
    requires: { kind: 'packageTier', tier: 'advanced' },
    steps: [],
  });
  // Step 0 costs nothing here: entry is paid by the archetype's own CP cost.
  r = edit.addTrackStep(r, 'rank', { index: 0, cost: null, unlocks: [] });
  r = edit.addTrackStep(r, 'rank', {
    index: 1,
    cost: { currencyId: 'influence', amount: 12 },
    unlocks: [],
  });
  r = edit.addTrackStep(r, 'rank', {
    index: 2,
    cost: { currencyId: 'influence', amount: 16 },
    unlocks: [{ kind: 'note', text: 'Access to Rank 2 archetype & signature skills' }],
  });
  r = edit.addTrackStep(r, 'rank', {
    index: 3,
    cost: { currencyId: 'influence', amount: 20 },
    unlocks: [],
  });

  /* --- phase-scoped caps --- */
  r = edit.addPurchaseRule(r, {
    id: 'creation-crafting-cap',
    label: 'Crafting capped at creation',
    message:
      'You may not purchase more than level 1 of any crafting skill at character creation.',
    phase: 'creation',
    appliesTo: { tag: 'crafting' },
    maxLevel: 1,
  });
  r = edit.addPurchaseRule(r, {
    id: 'creation-nonarchetype-cap',
    label: 'Non-archetype skills capped at creation',
    message:
      'At creation you may purchase up to level 1 of any skill not granted by your archetype.',
    phase: 'creation',
    appliesTo: {},
    maxLevel: 1,
    onlyIfNotGranted: true,
  });

  /* --- sheet --- */
  r = edit.addSheetSection(r, { id: 'identity', title: 'Identity', fields: [] });
  r = edit.addSheetField(r, 'identity', {
    id: 'name',
    label: 'Character Name',
    type: 'shortText',
    required: true,
  });
  r = edit.addSheetField(r, 'identity', {
    id: 'house',
    label: 'House / Affiliation',
    type: 'shortText',
    required: false,
  });
  r = edit.addSheetField(r, 'identity', {
    id: 'background',
    label: 'Background',
    type: 'longText',
    required: false,
    helpText: 'Where they come from, and what they left behind.',
  });

  return r;
}

test('Eldritch can be rebuilt using only the designer operations', () => {
  assert.deepEqual(buildEldritchThroughTheEditor(), eldritch);
});

test('the rebuilt ruleset is coherent', () => {
  assert.deepEqual(validateRuleset(buildEldritchThroughTheEditor()), []);
});

/* ------------------------------------------------------------------ *
 * Editing behaviour the designer depends on
 * ------------------------------------------------------------------ */

test('operations do not mutate the ruleset they are given', () => {
  // Undo is a stack of previous values, which only works if edits are pure.
  const before = buildEldritchThroughTheEditor();
  const snapshot = structuredClone(before);
  edit.removeTrait(edit.addCurrency(before, {
    id: 'x',
    name: 'X',
    kind: 'economy',
  }), 'academics');
  assert.deepEqual(before, snapshot);
});

test('a half-finished edit is allowed and reported, not refused', () => {
  // Authoring order is not dependency order: you draw the prerequisite, then
  // create the skill it points at.
  let r = edit.emptyRuleset('wip', 'Work in progress');
  r = edit.addCurrency(r, { id: 'cp', name: 'Points', kind: 'progression' });
  r = edit.addGroup(r, { id: 'g', name: 'G' });
  r = edit.addTrait(r, { id: 'a', name: 'A', groupId: 'g', tags: [], tiers: [] });
  r = edit.addTier(r, 'a', {
    level: 1,
    description: '',
    cost: { currencyId: 'cp', amount: 1 },
    requires: { kind: 'trait', traitId: 'not-yet-created', minLevel: 1 },
    grants: [],
  });

  const issues = validateRuleset(r);
  assert.ok(issues.some((i) => i.code === 'dangling-reference'));

  // ...and creating the missing skill resolves it, with no other edit needed.
  r = edit.addTrait(r, {
    id: 'not-yet-created',
    name: 'B',
    groupId: 'g',
    tags: [],
    tiers: [],
  });
  r = edit.addTier(r, 'not-yet-created', {
    level: 1,
    description: '',
    cost: { currencyId: 'cp', amount: 1 },
    requires: { kind: 'always' },
    grants: [],
  });
  assert.deepEqual(validateRuleset(r), []);
});

test('deleting a skill keeps its dependents and reports the break', () => {
  // Silently rewriting other skills' prerequisites would lose authored intent.
  const r = edit.removeTrait(buildEldritchThroughTheEditor(), 'artificer');
  const issues = validateRuleset(r);
  assert.ok(
    issues.some(
      (i) => i.code === 'dangling-reference' && i.subject?.id === 'bowyer'
    ),
    'expected Bowyer to report its missing prerequisite'
  );
});

test('node positions are recorded without touching the rules', () => {
  const before = buildEldritchThroughTheEditor();
  const after = edit.setNodePosition(before, 'academics', { x: 120, y: 40 });
  assert.deepEqual(after.layout, { academics: { x: 120, y: 40 } });
  // Layout is presentation: the rules are byte-identical either way.
  assert.deepEqual({ ...after, layout: undefined }, { ...before, layout: undefined });
  assert.deepEqual(validateRuleset(after), []);
});
