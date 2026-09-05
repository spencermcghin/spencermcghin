/**
 * Eldritch LARP encoded against the abstract schema.
 *
 * A proof, not the full corpus. It covers the parts of the Player's Guide
 * that are hardest to model, because those are what tell us whether the
 * abstraction is real:
 *
 *   - compound prerequisites   ("Artificer - 2 and Bowyer - 1")
 *   - archetype-gated trees    (Knight skills need the Knight archetype)
 *   - tag-scoped level caps    (crafting capped at character creation)
 *   - stacking modifiers       (Gentry 25% off rank, applied successively)
 *   - a second progression axis (Rank, bought with Influence)
 *   - choice grants            ("Hunting - 1 or Farming - 1")
 *
 * Source: Eldritch Player's Guide - 2026.
 */

import type { Ruleset, Trait, TraitTier } from '../rules-schema';

/** Most Eldritch skills are three tiers of flat cost, each needing the last. */
function ladder(
  id: string,
  name: string,
  groupId: string,
  cost: number,
  tags: string[] = [],
  descriptions?: string[]
): Trait {
  const tiers: TraitTier[] = [1, 2, 3].map((level) => ({
    level,
    description: descriptions?.[level - 1] ?? `${name} level ${level}.`,
    cost: { currencyId: 'cp', amount: cost },
    requires:
      level === 1
        ? { kind: 'always' as const }
        : { kind: 'trait' as const, traitId: id, minLevel: level - 1 },
    grants: [],
  }));
  return { id, name, groupId, tags, tiers };
}

export const eldritch: Ruleset = {
  id: 'eldritch',
  name: 'Eldritch',
  version: '2026',
  description:
    'A live action roleplaying game set in the Kingdom of Arnesse. Events take place in the Annwyn.',

  // Characters starting at Event 1 begin with 4 CP.
  startingBudget: [{ currencyId: 'cp', amount: 4 }],

  currencies: [
    { id: 'cp', name: 'Character Point', abbreviation: 'CP', kind: 'progression' },
    { id: 'influence', name: 'Influence', kind: 'progression' },
    { id: 'coin', name: 'Silver Dragon', abbreviation: 'sd', kind: 'economy' },
  ],

  packageTiers: [
    { id: 'basic', name: 'Basic Archetype', maxHeld: 1 },
    { id: 'advanced', name: 'Advanced Archetype', maxHeld: 1 },
  ],

  packageAttributes: [
    { key: 'startingEquipment', label: 'Starting Equipment' },
    { key: 'retainerBenefit', label: 'Retainer Benefit' },
    { key: 'salary', label: 'Salary' },
  ],

  packages: [
    {
      id: 'commonfolk',
      name: 'Commonfolk',
      tier: 'basic',
      cost: { currencyId: 'cp', amount: 1 },
      requires: { kind: 'always' },
      grants: [
        { kind: 'currency', currencyId: 'coin', amount: 20 },
        {
          kind: 'traitChoice',
          count: 1,
          level: 1,
          matching: { kind: 'always' },
        },
        { kind: 'note', text: '20 resources of your choice' },
      ],
      attributes: {
        startingEquipment: '20 resources of your choice',
        retainerBenefit: '8 Silver Dragons',
        salary: '3 Silver Dragons',
      },
    },
    {
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
    },
    {
      id: 'artificer-archetype',
      name: 'Artificer',
      tier: 'basic',
      cost: { currencyId: 'cp', amount: 4 },
      requires: { kind: 'always' },
      grants: [
        { kind: 'trait', traitId: 'artificer', level: 1 },
        // "Hunting - 1 or Farming - 1"
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
    },
    {
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
        // "Gentry get a 25% reduction on all rank increases."
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
    },
    {
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
    },
  ],

  traitGroups: [
    { id: 'general', name: 'General Skills', description: 'Purchasable by any character.' },
    { id: 'martial', name: 'Martial Skills' },
    {
      id: 'knight-tree',
      name: 'Knight Skills',
      description: 'Available only to characters holding the Knight archetype.',
      requires: { kind: 'package', packageId: 'knight' },
    },
  ],

  traits: [
    ladder('academics', 'Academics', 'general', 1, [], [
      'Can read and write. Access lore noted as level 1.',
      'Access lore noted as level 2.',
      'Access lore noted as level 3.',
    ]),
    ladder('alchemy', 'Alchemy', 'general', 3, ['crafting']),
    ladder('artificer', 'Artificer', 'general', 3, ['crafting']),
    ladder('herbalism', 'Herbalism', 'general', 1),
    ladder('hunting', 'Hunting', 'general', 1),
    ladder('farming', 'Farming', 'general', 1),
    ladder('income', 'Income', 'general', 1),
    ladder('influential', 'Influential', 'general', 1),
    ladder('espionage', 'Espionage', 'general', 1),
    ladder('one-hand-weapon', '1-Hand Weapon', 'martial', 2),

    {
      id: 'bowyer',
      name: 'Bowyer',
      groupId: 'general',
      tags: ['crafting'],
      tiers: [
        {
          level: 1,
          description: 'Can make bows and arrows, and repair bows.',
          cost: { currencyId: 'cp', amount: 1 },
          requires: { kind: 'trait', traitId: 'artificer', minLevel: 1 },
          grants: [],
        },
        {
          // The compound case: "Artificer - 2 and Bowyer - 1".
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
        },
        {
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
        },
      ],
    },

    // Archetype-gated by its group, and the signature tier additionally
    // gated on Rank -- the two ways availability narrows.
    {
      id: 'banner-of-mercy',
      name: 'Banner of Mercy',
      groupId: 'knight-tree',
      tags: ['signature'],
      tiers: [
        {
          level: 1,
          description: '25% reduction in time for healing roleplay.',
          cost: { currencyId: 'cp', amount: 2 },
          requires: { kind: 'track', trackId: 'rank', minStep: 2 },
          grants: [],
        },
      ],
    },
    {
      id: 'shield-wall',
      name: 'Shield Wall',
      groupId: 'knight-tree',
      tags: [],
      tiers: [
        {
          level: 1,
          description: 'Hold the line alongside an adjacent ally.',
          cost: { currencyId: 'cp', amount: 2 },
          requires: { kind: 'always' },
          grants: [],
        },
      ],
    },
  ],

  tracks: [
    {
      id: 'rank',
      name: 'Rank',
      currencyId: 'influence',
      requires: { kind: 'packageTier', tier: 'advanced' },
      steps: [
        // Rank 0 is paid for by the advanced archetype's own CP cost.
        { index: 0, cost: null, unlocks: [] },
        { index: 1, cost: { currencyId: 'influence', amount: 12 }, unlocks: [] },
        {
          index: 2,
          cost: { currencyId: 'influence', amount: 16 },
          unlocks: [{ kind: 'note', text: 'Access to Rank 2 archetype & signature skills' }],
        },
        { index: 3, cost: { currencyId: 'influence', amount: 20 }, unlocks: [] },
      ],
    },
  ],

  purchaseRules: [
    {
      id: 'creation-crafting-cap',
      label: 'Crafting capped at creation',
      message:
        'You may not purchase more than level 1 of any crafting skill at character creation.',
      phase: 'creation',
      appliesTo: { tag: 'crafting' },
      maxLevel: 1,
    },
    {
      id: 'creation-nonarchetype-cap',
      label: 'Non-archetype skills capped at creation',
      message:
        'At creation you may purchase up to level 1 of any skill not granted by your archetype.',
      phase: 'creation',
      appliesTo: {},
      maxLevel: 1,
      onlyIfNotGranted: true,
    },
  ],

  sheet: [
    {
      id: 'identity',
      title: 'Identity',
      fields: [
        { id: 'name', label: 'Character Name', type: 'shortText', required: true },
        { id: 'house', label: 'House / Affiliation', type: 'shortText', required: false },
        {
          id: 'background',
          label: 'Background',
          type: 'longText',
          required: false,
          helpText: 'Where they come from, and what they left behind.',
        },
      ],
    },
  ],
};
