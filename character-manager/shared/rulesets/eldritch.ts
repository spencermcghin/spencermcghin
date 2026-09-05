/**
 * Eldritch LARP encoded against the abstract schema.
 *
 * This is a proof, not the full corpus. It deliberately covers the parts of
 * the Player's Guide that are hardest to model, because those are what tell
 * us whether the abstraction is real:
 *
 *   - compound prerequisites  ("Artificer - 2 and Bowyer - 1")
 *   - tag-scoped level caps   (crafting skills capped by event number)
 *   - stacking modifiers      (Gentry 25% off rank, applied successively)
 *   - a second progression axis (Rank, bought with Influence, once per event)
 *   - choice grants           ("Hunting - 1 or Farming - 1")
 *   - relationship eligibility (who may retain whom)
 *
 * Source: Eldritch Player's Guide - 2026.
 */

import type { Ruleset } from '../rules-schema';

export const eldritch: Ruleset = {
  id: 'eldritch',
  name: 'Eldritch',
  version: '2026',
  description:
    'A live action roleplaying game set in the Kingdom of Arnesse. Events take place in the Annwyn.',

  currencies: [
    { id: 'cp', name: 'Character Point', abbreviation: 'CP', kind: 'progression' },
    { id: 'influence', name: 'Influence', kind: 'progression' },
    { id: 'coin', name: 'Silver Dragon', abbreviation: 'sd', kind: 'economy' },
    { id: 'espionage', name: 'Espionage Point', kind: 'economy' },
  ],

  timeline: {
    unitLabel: 'Event',
    entries: [
      { index: 1, label: 'Event I', grants: [{ kind: 'currency', currencyId: 'cp', amount: 1 }] },
      { index: 2, label: 'Event II', grants: [{ kind: 'currency', currencyId: 'cp', amount: 2 }] },
      { index: 3, label: 'Event III', grants: [{ kind: 'currency', currencyId: 'cp', amount: 1 }] },
      { index: 4, label: 'Event IV', grants: [{ kind: 'currency', currencyId: 'cp', amount: 2 }] },
      { index: 5, label: 'Event V', grants: [{ kind: 'currency', currencyId: 'cp', amount: 2 }] },
      { index: 6, label: 'Event VI', grants: [{ kind: 'currency', currencyId: 'cp', amount: 2 }] },
      { index: 7, label: 'Event VII', grants: [{ kind: 'currency', currencyId: 'cp', amount: 2 }] },
      { index: 8, label: 'Event VIII', grants: [{ kind: 'currency', currencyId: 'cp', amount: 2 }] },
      { index: 9, label: 'Event IX', grants: [{ kind: 'currency', currencyId: 'cp', amount: 2 }] },
      { index: 10, label: 'Event X', grants: [] },
    ],
  },

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
        // "1 non-crafting, level 1 general skill"
        {
          kind: 'traitChoice',
          count: 1,
          level: 1,
          matching: {
            kind: 'all',
            of: [
              { kind: 'always' },
              { kind: 'not', of: { kind: 'tagLevelCap', tag: 'crafting', maxLevel: 0 } },
            ],
          },
        },
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
        { kind: 'item', itemId: 'apothecary-kit', quantity: 2 },
      ],
      attributes: {
        startingEquipment:
          '2 Apothecary Kits, 4 level 1 apothecary schematics of your choice, and enough resources to craft two schematics',
        retainerBenefit: '8 Common Herbs',
        salary: '3 silver dragons',
      },
    },
    {
      id: 'artificer',
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
        startingEquipment: '2 Artificer Kits, 4 level 1 artificer schematics of your choice',
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
  ],

  traitGroups: [
    { id: 'general', name: 'General Skills', description: 'Purchasable by any character.' },
    { id: 'martial', name: 'Martial Skills' },
    {
      id: 'advanced',
      name: 'Advanced Archetype Skills',
      description: 'Require the corresponding advanced archetype.',
      requires: { kind: 'packageTier', tier: 'advanced' },
    },
  ],

  traits: [
    {
      id: 'academics',
      name: 'Academics',
      groupId: 'general',
      tags: [],
      tiers: [
        {
          level: 1,
          description: 'Can read and write. Access lore noted as level 1.',
          cost: { currencyId: 'cp', amount: 1 },
          requires: { kind: 'always' },
          grants: [],
        },
        {
          level: 2,
          description: 'Access lore noted as level 2.',
          cost: { currencyId: 'cp', amount: 2 },
          requires: { kind: 'trait', traitId: 'academics', minLevel: 1 },
          grants: [],
        },
        {
          level: 3,
          description: 'Access lore noted as level 3.',
          cost: { currencyId: 'cp', amount: 2 },
          requires: { kind: 'trait', traitId: 'academics', minLevel: 2 },
          grants: [],
        },
      ],
    },
    {
      id: 'alchemy',
      name: 'Alchemy',
      groupId: 'general',
      tags: ['crafting'],
      tiers: [1, 2, 3].map((level) => ({
        level,
        description: `Can use level ${level} schematics to create alchemy substances.`,
        cost: { currencyId: 'cp' as const, amount: 3 },
        requires:
          level === 1
            ? ({ kind: 'always' } as const)
            : ({ kind: 'trait', traitId: 'alchemy', minLevel: level - 1 } as const),
        grants: [],
      })),
    },
    {
      id: 'artificer',
      name: 'Artificer',
      groupId: 'general',
      tags: ['crafting'],
      tiers: [1, 2, 3].map((level) => ({
        level,
        description: `Can use level ${level} schematics to create artificer goods.`,
        cost: { currencyId: 'cp' as const, amount: 3 },
        requires:
          level === 1
            ? ({ kind: 'always' } as const)
            : ({ kind: 'trait', traitId: 'artificer', minLevel: level - 1 } as const),
        grants: [],
      })),
    },
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
    ...['herbalism', 'hunting', 'farming', 'income', 'influential', 'espionage'].map((id) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      groupId: 'general',
      tags: [] as string[],
      tiers: [1, 2, 3].map((level) => ({
        level,
        description: `${id} level ${level}.`,
        cost: { currencyId: 'cp' as const, amount: 1 },
        requires:
          level === 1
            ? ({ kind: 'always' } as const)
            : ({ kind: 'trait', traitId: id, minLevel: level - 1 } as const),
        grants: [],
      })),
    })),
  ],

  tracks: [
    {
      id: 'rank',
      name: 'Rank',
      currencyId: 'influence',
      requires: { kind: 'packageTier', tier: 'advanced' },
      advanceLimit: { per: 'timelineEntry', count: 1 },
      steps: [
        {
          index: 0,
          cost: null, // paid via the advanced archetype's own CP cost
          unlocks: [
            { kind: 'note', text: 'One free level 1 Advanced Archetype skill in primary or general tree' },
          ],
        },
        { index: 1, cost: { currencyId: 'influence', amount: 12 }, unlocks: [] },
        {
          index: 2,
          cost: { currencyId: 'influence', amount: 16 },
          unlocks: [{ kind: 'note', text: 'Access to all Rank 2 archetype & signature skills' }],
        },
        { index: 3, cost: { currencyId: 'influence', amount: 20 }, unlocks: [] },
      ],
    },
  ],

  effects: [
    {
      id: 'cleave',
      name: 'Cleave',
      description:
        'Attacks go through any Armor Value on the target. Does not go through shields.',
      delivery: 'targeted',
      category: 'martial',
      stacksWith: [],
      negatedBy: ['resist'],
    },
    {
      id: 'fear',
      name: 'Fear',
      description:
        'Target cannot approach the source of their Fear for at least 10 seconds.',
      delivery: 'targeted',
      category: 'mental',
      durationSeconds: 10,
      stacksWith: [],
      negatedBy: ['resist'],
    },
    {
      id: 'paralyze',
      name: 'Paralyze',
      description: 'Target freezes in place, unable to speak, move, or act.',
      delivery: 'targeted',
      category: 'mental',
      durationSeconds: 600,
      stacksWith: [],
      negatedBy: ['resist'],
    },
    {
      id: 'poison',
      name: 'Poison',
      description: 'Delivered by card. Stacks with itself, Curses, and Diseases.',
      delivery: 'carded',
      category: 'affliction',
      stacksWith: ['poison', 'curse', 'disease'],
      negatedBy: [],
    },
  ],

  relationships: [
    {
      id: 'retainer',
      name: 'Retainer',
      holderLabel: 'Patron',
      memberLabel: 'Retainer',
      holderRequires: { kind: 'always' }, // refined by slot-granting traits
      memberEligibility: { kind: 'not', of: { kind: 'packageTier', tier: 'advanced' } },
      payloadAttributes: ['retainerBenefit', 'salary'],
    },
  ],

  items: [
    { id: 'apothecary-kit', name: "Apothecary Kit", category: 'kit', tags: ['crafting'] },
    { id: 'common-herbs', name: 'Common Herbs', category: 'resource', tags: ['resource'] },
    { id: 'iron-ingot', name: 'Iron Ingot', category: 'resource', tags: ['resource'] },
  ],

  sheet: [
    {
      id: 'identity',
      title: 'Identity',
      fields: [
        { id: 'name', label: 'Character Name', type: 'shortText', required: true },
        { id: 'house', label: 'House / Affiliation', type: 'shortText', required: false },
        { id: 'background', label: 'Background', type: 'longText', required: false },
      ],
    },
  ],

  globalRules: [
    {
      id: 'creation-cap-nonarchetype',
      label: 'Creation cap on non-archetype skills before Event 5',
      when: { kind: 'timelineBefore', index: 5 },
      require: {
        kind: 'any',
        of: [
          { kind: 'grantedByOwnPackage', traitId: '*' },
          { kind: 'tagLevelCap', tag: '*', maxLevel: 1 },
        ],
      },
      message:
        'Before Event 5 you may purchase up to level 1 of any skill not granted by your archetype.',
      phase: 'creation',
    },
    {
      id: 'creation-cap-crafting',
      label: 'Creation cap on crafting skills before Event 5',
      when: { kind: 'timelineBefore', index: 5 },
      require: { kind: 'tagLevelCap', tag: 'crafting', maxLevel: 1 },
      message:
        'Before Event 5 you may not purchase more than level 1 of any crafting skill at character creation, even if it came with your archetype.',
      phase: 'creation',
    },
    {
      id: 'advancement-crafting-l2',
      label: 'Crafting level 2 gated to Event 5',
      when: { kind: 'timelineBefore', index: 5 },
      require: { kind: 'tagLevelCap', tag: 'crafting', maxLevel: 1 },
      message: 'Level 2 crafting skills unlock at Event 5, when level 2 schematics are released.',
      phase: 'advancement',
    },
    {
      id: 'advancement-crafting-l3',
      label: 'Crafting level 3 gated to Event 7',
      when: { kind: 'timelineBefore', index: 7 },
      require: { kind: 'tagLevelCap', tag: 'crafting', maxLevel: 2 },
      message: 'Level 3 crafting skills unlock at Event 7, when level 3 schematics are released.',
      phase: 'advancement',
    },
  ],
};
