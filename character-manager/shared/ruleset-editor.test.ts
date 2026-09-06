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

  /* --- metadata fields skills may carry --- */
  r = edit.addTraitAttribute(r, { key: 'calls', label: 'Calls', scope: 'tier' });

  /* --- the non-skill things rules gate on --- */
  r = edit.addQuality(r, {
    id: 'lockpicking-kit',
    name: 'Lockpicking Kit',
    category: 'Equipment',
    description: 'Picks and a tension wrench. A player knows whether they own one.',
    grantedBy: 'player',
  });
  r = edit.addQuality(r, {
    id: 'dusklander',
    name: 'Dusklander Background',
    category: 'Background',
    description:
      'Raised beyond the last wardstone. Agreed with staff at character ' +
      'approval, so a player cannot simply award it to themselves.',
    grantedBy: 'staff',
  });

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

  // The gates that are not skills: something owned, and something a person
  // has to judge.
  r = edit.addTrait(r, {
    id: 'lockpicking',
    name: 'Lockpicking',
    groupId: 'general',
    summary:
      'Every lock is a small argument about who is allowed through. ' +
      'Requires a kit; bare hands and optimism open nothing.',
    tags: [],
    tiers: [],
  });
  r = edit.addTier(r, 'lockpicking', {
    level: 1,
    description: 'Open a simple lock, given a minute and no one shouting.',
    cost: { currencyId: 'cp', amount: 1 },
    requires: { kind: 'quality', qualityId: 'lockpicking-kit' },
    grants: [],
  });
  r = edit.addTier(r, 'lockpicking', {
    level: 2,
    description: 'Open a warded lock, and know when one is trapped.',
    cost: { currencyId: 'cp', amount: 1 },
    requires: {
      kind: 'all',
      of: [
        { kind: 'trait', traitId: 'lockpicking', minLevel: 1 },
        {
          kind: 'manual',
          text: 'Staff must watch you open a practice lock at check-in.',
        },
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
    summary:
      'Two shields braced together hold a corridor no single knight could. ' +
      'Taught in the outer wards, where the walls are thin and the retreat is long.',
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
  // Set through the editor, as an author would, rather than passed inline.
  r = edit.setTierAttribute(r, 'shield-wall', 1, 'calls', 'Resist');

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

/* ------------------------------------------------------------------ *
 * Prerequisites as canvas edges
 * ------------------------------------------------------------------ */

test('an existing compound prerequisite reads back as two edges', () => {
  // Bowyer 2 requires Artificer 2 and Bowyer 1. The canvas must show both.
  const tier = eldritch.traits
    .find((t) => t.id === 'bowyer')!
    .tiers.find((t) => t.level === 2)!;
  assert.deepEqual(edit.prerequisiteEdges(tier.requires), [
    { traitId: 'artificer', minLevel: 2 },
    { traitId: 'bowyer', minLevel: 1 },
  ]);
});

test('drawing an edge onto an unconditional skill replaces "always"', () => {
  const r = edit.addPrerequisite(eldritch, 'shield-wall', 1, 'one-hand-weapon', 1);
  const tier = r.traits.find((t) => t.id === 'shield-wall')!.tiers[0];
  assert.deepEqual(tier.requires, {
    kind: 'trait',
    traitId: 'one-hand-weapon',
    minLevel: 1,
  });
});

test('drawing an edge onto an existing condition conjoins rather than replaces', () => {
  // Banner of Mercy already requires Rank 2; that must survive.
  const r = edit.addPrerequisite(eldritch, 'banner-of-mercy', 1, 'shield-wall', 1);
  const tier = r.traits.find((t) => t.id === 'banner-of-mercy')!.tiers[0];
  assert.deepEqual(tier.requires, {
    kind: 'all',
    of: [
      { kind: 'track', trackId: 'rank', minStep: 2 },
      { kind: 'trait', traitId: 'shield-wall', minLevel: 1 },
    ],
  });
});

test('drawing an edge into an existing "all" appends to it', () => {
  const r = edit.addPrerequisite(eldritch, 'bowyer', 2, 'academics', 1);
  const tier = r.traits.find((t) => t.id === 'bowyer')!.tiers.find((t) => t.level === 2)!;
  assert.deepEqual(edit.prerequisiteEdges(tier.requires), [
    { traitId: 'artificer', minLevel: 2 },
    { traitId: 'bowyer', minLevel: 1 },
    { traitId: 'academics', minLevel: 1 },
  ]);
});

test('re-drawing an existing edge changes its level instead of duplicating it', () => {
  // Otherwise a condition could end up demanding Artificer 2 and Artificer 3.
  const r = edit.addPrerequisite(eldritch, 'bowyer', 2, 'artificer', 3);
  const tier = r.traits.find((t) => t.id === 'bowyer')!.tiers.find((t) => t.level === 2)!;
  const edges = edit.prerequisiteEdges(tier.requires);
  assert.equal(edges.filter((e) => e.traitId === 'artificer').length, 1);
  assert.deepEqual(
    edges.find((e) => e.traitId === 'artificer'),
    { traitId: 'artificer', minLevel: 3 }
  );
});

test('deleting one edge of a compound prerequisite keeps the other', () => {
  const r = edit.removePrerequisite(eldritch, 'bowyer', 2, 'artificer');
  const tier = r.traits.find((t) => t.id === 'bowyer')!.tiers.find((t) => t.level === 2)!;
  // One clause left, so the wrapping `all` collapses away.
  assert.deepEqual(tier.requires, { kind: 'trait', traitId: 'bowyer', minLevel: 1 });
});

test('deleting the last edge leaves the skill unconditional, not broken', () => {
  let r = edit.removePrerequisite(eldritch, 'bowyer', 1, 'artificer');
  const tier = r.traits.find((t) => t.id === 'bowyer')!.tiers[0];
  assert.deepEqual(tier.requires, { kind: 'always' });
  assert.deepEqual(validateRuleset(r), []);
});

test('a clause under "any" is not exposed as an edge', () => {
  // An edge means a hard requirement. "A or B" is not that, so it stays a
  // raw condition rather than being flattened into misleading edges.
  const condition = {
    kind: 'any' as const,
    of: [
      { kind: 'trait' as const, traitId: 'a', minLevel: 1 },
      { kind: 'trait' as const, traitId: 'b', minLevel: 1 },
    ],
  };
  assert.deepEqual(edit.prerequisiteEdges(condition), []);
});

test('closing a loop by drawing an edge is caught immediately', () => {
  // Artificer already gates Bowyer; pointing Artificer back at Bowyer makes
  // both unbuyable. This is the mistake a canvas makes easiest.
  const r = edit.addPrerequisite(eldritch, 'artificer', 1, 'bowyer', 1);
  const issue = validateRuleset(r).find((i) => i.code === 'prerequisite-cycle');
  assert.ok(issue, 'expected the new edge to be reported as a cycle');
  assert.match(issue.message, /Artificer/);
  assert.match(issue.message, /Bowyer/);
});


/* ------------------------------------------------------------------ *
 * Descriptions and metadata
 * ------------------------------------------------------------------ */

test('a skill carries prose and per-level metadata', () => {
  const shieldWall = eldritch.traits.find((t) => t.id === 'shield-wall')!;
  assert.match(shieldWall.summary ?? '', /outer wards/);
  assert.equal(shieldWall.tiers[0].attributes?.calls, 'Resist');
});

test('metadata under an undeclared key warns rather than vanishing silently', () => {
  // Otherwise an author types into a field that was never declared and the
  // value is simply never shown, with nothing to explain why.
  const r = edit.setTierAttribute(eldritch, 'shield-wall', 1, 'notAField', 'x');
  const issue = validateRuleset(r).find((i) => i.code === 'undeclared-attribute');
  assert.ok(issue);
  assert.equal(issue.severity, 'warning');
  assert.match(issue.message, /notAField/);
});

test('a declared field accepts values on every skill that wants one', () => {
  let r = edit.addTraitAttribute(eldritch, {
    key: 'sourceBook',
    label: 'Source',
    scope: 'trait',
  });
  r = edit.setTraitAttribute(r, 'academics', 'sourceBook', "Player's Guide 2026");
  assert.equal(
    r.traits.find((t) => t.id === 'academics')?.attributes?.sourceBook,
    "Player's Guide 2026"
  );
  assert.deepEqual(validateRuleset(r), []);
});

test('a refund is a negative cost, and reduces spend', () => {
  // Eldritch's Chemist Refund costs -1 CP; the engine must not treat a cost
  // as necessarily positive.
  let r = edit.addTrait(eldritch, {
    id: 'chemist-refund',
    name: 'Chemist Refund',
    groupId: 'general',
    tags: [],
    tiers: [],
  });
  r = edit.addTier(r, 'chemist-refund', {
    level: 1,
    description: 'Hands a character point back.',
    cost: { currencyId: 'cp', amount: -1 },
    requires: { kind: 'trait', traitId: 'alchemy', minLevel: 1 },
    grants: [],
  });
  assert.deepEqual(validateRuleset(r), []);
});

/* ------------------------------------------------------------------ *
 * Grouping derived from the rules
 * ------------------------------------------------------------------ */

test('a Rank gate reads back the same way a skill prerequisite does', () => {
  const banner = eldritch.traits.find((t) => t.id === 'banner-of-mercy')!;
  assert.deepEqual(edit.trackGates(banner.tiers[0].requires), [
    { trackId: 'rank', minStep: 2 },
  ]);
});

test('a skill sorts under its Rank without anyone recording one', () => {
  // This is what makes a "rank board" a grouping of the outline rather than a
  // second editor: the column is computed from the condition already written.
  const at = (id: string) =>
    edit.trackPositionOf(eldritch.traits.find((t) => t.id === id)!, 'rank');
  assert.equal(at('banner-of-mercy'), 2);
  assert.equal(at('shield-wall'), null); // ungated: belongs in no rank column
  assert.equal(at('academics'), null);
});

test('a compound gate still yields its rank', () => {
  // "Martial Expertise 3 requires Martial Expertise 2 and Rank 3" -- the rank
  // is buried beside a ladder clause, and must still be found.
  let r = edit.addTrait(eldritch, {
    id: 'martial-expertise',
    name: 'Martial Expertise',
    groupId: 'martial',
    tags: [],
    tiers: [],
  });
  r = edit.addTier(r, 'martial-expertise', {
    level: 1,
    description: '',
    cost: { currencyId: 'cp', amount: 2 },
    requires: {
      kind: 'all',
      of: [
        { kind: 'trait', traitId: 'one-hand-weapon', minLevel: 1 },
        { kind: 'track', trackId: 'rank', minStep: 3 },
      ],
    },
    grants: [],
  });
  const t = r.traits.find((x) => x.id === 'martial-expertise')!;
  assert.equal(edit.trackPositionOf(t, 'rank'), 3);
  // ...and it is still a normal prerequisite edge as well.
  assert.deepEqual(edit.prerequisiteEdges(t.tiers[0].requires), [
    { traitId: 'one-hand-weapon', minLevel: 1 },
  ]);
});

test('groupings are offered from what the ruleset already contains', () => {
  const dims = edit.groupingDimensions(eldritch);
  assert.deepEqual(
    dims.map((d) => d.label),
    ['Tree', 'Rank', 'Tag']
  );

  // A game with no track simply offers one fewer, with no special-casing.
  let plain = edit.emptyRuleset('p', 'Plain');
  plain = edit.addGroup(plain, { id: 'g', name: 'Skills' });
  assert.deepEqual(edit.groupingDimensions(plain).map((d) => d.label), ['Tree']);
});

/* ------------------------------------------------------------------ *
 * Conditions as a clause list
 * ------------------------------------------------------------------ */

test('a compound condition reads as its clauses and writes back unchanged', () => {
  const tier = eldritch.traits
    .find((t) => t.id === 'bowyer')!
    .tiers.find((t) => t.level === 2)!;
  const clauses = edit.clausesOf(tier.requires);
  assert.equal(clauses.length, 2);
  assert.equal(edit.operatorOf(tier.requires), 'all');
  // Round-trip must be identity, or opening a skill would rewrite it.
  assert.deepEqual(edit.conditionFrom('all', clauses), tier.requires);
});

test('an unconditional level has no clauses, and empties back to unconditional', () => {
  const tier = eldritch.traits.find((t) => t.id === 'shield-wall')!.tiers[0];
  assert.deepEqual(edit.clausesOf(tier.requires), []);
  assert.deepEqual(edit.conditionFrom('all', []), { kind: 'always' });
});

test('a single clause is stored bare, not wrapped', () => {
  // So a hand-written ruleset and an editor-built one are indistinguishable.
  const one = edit.conditionFrom('all', [
    { kind: 'track', trackId: 'rank', minStep: 2 },
  ]);
  assert.deepEqual(one, { kind: 'track', trackId: 'rank', minStep: 2 });
});

test('clauses of every gate kind survive a round trip', () => {
  const clauses: Parameters<typeof edit.conditionFrom>[1] = [
    { kind: 'trait', traitId: 'artificer', minLevel: 2 },
    { kind: 'track', trackId: 'rank', minStep: 1 },
    { kind: 'package', packageId: 'knight' },
    { kind: 'packageTier', tier: 'advanced' },
  ];
  const built = edit.conditionFrom('all', clauses);
  assert.deepEqual(edit.clausesOf(built), clauses);
});

test('a nested clause is kept opaque rather than flattened', () => {
  // Flattening "A and (B or C)" into "A and B and C" would change what the
  // rule means. The editor shows it as one clause it will not touch.
  const nested = edit.conditionFrom('all', [
    { kind: 'trait', traitId: 'academics', minLevel: 1 },
    { kind: 'any', of: [
      { kind: 'trait', traitId: 'hunting', minLevel: 1 },
      { kind: 'trait', traitId: 'farming', minLevel: 1 },
    ] },
  ]);
  const clauses = edit.clausesOf(nested);
  assert.equal(clauses.length, 2);
  assert.equal(edit.isOpaqueClause(clauses[0]), false);
  assert.equal(edit.isOpaqueClause(clauses[1]), true);
  assert.deepEqual(edit.conditionFrom('all', clauses), nested);
});

test('editing one level does not disturb the others', () => {
  const r = edit.setTierCondition(eldritch, 'bowyer', 1, { kind: 'always' });
  const bowyer = r.traits.find((t) => t.id === 'bowyer')!;
  assert.deepEqual(bowyer.tiers[0].requires, { kind: 'always' });
  // Level 2's compound prerequisite is untouched.
  assert.deepEqual(
    bowyer.tiers[1].requires,
    eldritch.traits.find((t) => t.id === 'bowyer')!.tiers[1].requires
  );
});

/* ---------------- qualities ---------------- */

test('deleting a quality leaves the rules that need it, and reports the break', () => {
  // Same principle as removeGroup: rewriting rules the author did not touch
  // would be worse than naming what broke.
  const before = buildEldritchThroughTheEditor();
  assert.deepEqual(validateRuleset(before), []);

  const after = edit.removeQuality(before, 'lockpicking-kit');
  const tier = after.traits.find((t) => t.id === 'lockpicking')!.tiers[0];
  assert.deepEqual(tier.requires, { kind: 'quality', qualityId: 'lockpicking-kit' });
  assert.ok(validateRuleset(after).some((i) => i.code === 'dangling-reference'));
});

test('a quality can be renamed without touching the rules that use it', () => {
  const r = edit.updateQuality(buildEldritchThroughTheEditor(), 'lockpicking-kit', {
    name: 'Thieves’ Tools',
  });
  assert.equal(r.qualities.find((q) => q.id === 'lockpicking-kit')!.name, 'Thieves’ Tools');
  assert.deepEqual(validateRuleset(r), []);
});
