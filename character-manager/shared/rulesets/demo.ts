/**
 * The ruleset every new account starts with.
 *
 * Its job is to be taken apart. Someone opening this app for the first time
 * has no idea what a "track" or a "quality" is, and a blank project teaches
 * them nothing; a real published game teaches them the game rather than the
 * tool. So this is a small, deliberately generic set that uses every feature
 * the editor supports at least once, and says so in its own descriptions.
 *
 * Two rules held to throughout:
 *
 *   1. Every description does double duty. It says what the thing is in the
 *      fiction, then what it demonstrates -- because someone reading it is
 *      looking at the editor at the same time.
 *
 *   2. Nothing here is load-bearing. It is a copy, owned by whoever it was
 *      seeded for, and deleting all of it must leave a working project.
 */

import type { Ruleset } from '../rules-schema';

export const demoRuleset: Ruleset = {
  id: 'demo',
  name: 'Demo Rules Set',
  version: '1.0',
  description:
    'A small, complete ruleset built to be pulled apart. Every feature the ' +
    'editor supports appears here at least once, and each entry explains ' +
    'what it is demonstrating. Open the rules editor and start changing ' +
    'things: this copy belongs to you, and nothing else depends on it.',

  // A character starts with enough to buy a calling and a few levels.
  startingBudget: [{ currencyId: 'xp', amount: 10 }],

  currencies: [
    {
      id: 'xp',
      name: 'Experience',
      abbreviation: 'XP',
      kind: 'progression',
      startingAmount: 10,
    },
    {
      // A second progression currency keeps advancement on separate budgets.
      // Reputation below is bought with Standing, so no amount of Experience
      // will buy rank, and vice versa.
      id: 'standing',
      name: 'Standing',
      abbreviation: 'ST',
      kind: 'progression',
    },
    {
      // Economy currencies circulate in play. The engine tracks them but
      // never spends them on advancement.
      id: 'coin',
      name: 'Coin',
      abbreviation: 'c',
      kind: 'economy',
    },
  ],

  packageTiers: [
    {
      id: 'calling',
      name: 'Calling',
      // One at a time: the engine reports a violation if a character somehow
      // ends up holding two.
      maxHeld: 1,
    },
  ],

  packageAttributes: [
    { key: 'gear', label: 'Starting Gear' },
    { key: 'income', label: 'Seasonal Income' },
  ],

  traitAttributes: [
    {
      // Tier scope: what a skill grants can change at every level, so the
      // value lives on the level rather than the skill.
      key: 'calls',
      label: 'Calls',
      scope: 'tier',
    },
    {
      // Trait scope: one value for the whole skill, however many levels it
      // has.
      key: 'safety',
      label: 'Safety Note',
      scope: 'trait',
    },
  ],

  qualities: [
    {
      id: 'healers-kit',
      name: "Healer's Kit",
      category: 'Gear',
      description:
        'Bandages, a needle, clean water, and somewhere dry to keep them. ' +
        'Players record this themselves, because a player knows what their ' +
        'character is carrying.',
      grantedBy: 'player',
    },
    {
      id: 'guild-charter',
      name: 'Guild Charter',
      category: 'Standing',
      description:
        'A signed writ admitting the holder to a chartered guild. Marked ' +
        'staff-granted: a player can see it on their sheet, but only ' +
        'project staff can award or withdraw it.',
      grantedBy: 'staff',
    },
  ],

  packages: [
    {
      id: 'scout',
      name: 'Scout',
      tier: 'calling',
      cost: { currencyId: 'xp', amount: 2 },
      requires: { kind: 'always' },
      grants: [
        { kind: 'trait', traitId: 'tracking', level: 1 },
        {
          // "One of the following." The player's choice is preserved rather
          // than flattened into whichever option was written first.
          kind: 'choice',
          pick: 1,
          from: [
            { kind: 'trait', traitId: 'athletics', level: 1 },
            { kind: 'trait', traitId: 'stealth', level: 1 },
          ],
        },
      ],
      attributes: {
        gear: 'A bedroll, a hooded lantern, and forty feet of rope.',
        income: '5 Coin',
      },
      notes: 'Opens the Scout Techniques tree.',
    },
    {
      id: 'healer',
      name: 'Healer',
      tier: 'calling',
      cost: { currencyId: 'xp', amount: 2 },
      requires: { kind: 'always' },
      grants: [
        { kind: 'trait', traitId: 'herb-lore', level: 1 },
        {
          // A cost modifier, attached to the calling that confers it. It
          // targets a tag rather than a named skill, so any skill tagged
          // "medicine" later is covered without editing this.
          //
          // Rounding is worth a look: at a cost of 2, a quarter off gives
          // 1.5, which rounds straight back up to 2 under halfUp and buys
          // the character nothing. Rounding down makes the reduction real.
          // Real rulesets disagree about this, so the schema makes you say.
          kind: 'modifier',
          modifier: {
            id: 'healer-medicine-discount',
            label: "Healer's training",
            target: { kind: 'traitCost', tag: 'medicine' },
            operation: 'percentReduction',
            value: 25,
            stacking: 'successive',
            rounding: 'down',
          },
        },
      ],
      attributes: {
        gear: 'A physician’s bag and a letter of introduction.',
        income: '4 Coin',
      },
    },
    {
      id: 'merchant',
      name: 'Merchant',
      tier: 'calling',
      cost: { currencyId: 'xp', amount: 2 },
      requires: { kind: 'always' },
      grants: [
        { kind: 'trait', traitId: 'haggling', level: 1 },
        // Currency grants are how a calling starts a character with money.
        { kind: 'currency', currencyId: 'coin', amount: 30 },
        {
          // Text the engine cannot act on, carried through to the sheet so
          // staff and players still see it.
          kind: 'note',
          text: 'Begins play owed a favour by one merchant house.',
        },
      ],
      attributes: {
        gear: 'A locked strongbox and a ledger with three pages torn out.',
        income: '8 Coin',
      },
    },
  ],

  traitGroups: [
    {
      id: 'general',
      name: 'General Skills',
      description:
        'Open to every character. A group with no requirement is the ' +
        'default, and anything you add here is available from character ' +
        'creation onward.',
    },
    {
      id: 'crafts',
      name: 'Crafts',
      description:
        'Trades that produce something physical. These skills share the ' +
        '"crafting" tag, which is how the creation cap reaches all of them ' +
        'at once without naming any of them individually.',
    },
    {
      id: 'scoutcraft',
      name: 'Scout Techniques',
      description:
        'Restricted to characters who took the Scout calling. The ' +
        'requirement sits on the group, so every skill inside inherits it ' +
        'and none of them needs a gate of its own.',
      requires: { kind: 'package', packageId: 'scout' },
    },
  ],

  traits: [
    {
      id: 'athletics',
      name: 'Athletics',
      groupId: 'general',
      summary:
        'Running, climbing, and keeping hold of things you have no business ' +
        'keeping hold of. The simplest shape this editor makes: three ' +
        'levels, a flat cost, and no requirement beyond the level below.',
      tags: [],
      tiers: [
        {
          level: 1,
          description: 'Climb a wall with handholds, or run a mile without stopping.',
          cost: { currencyId: 'xp', amount: 1 },
          requires: { kind: 'always' },
          grants: [],
        },
        {
          level: 2,
          description: 'Climb a wall without handholds. Fall twice your height unhurt.',
          cost: { currencyId: 'xp', amount: 1 },
          requires: { kind: 'trait', traitId: 'athletics', minLevel: 1 },
          grants: [],
        },
        {
          level: 3,
          description: 'Carry another person at a run for as long as you could run alone.',
          cost: { currencyId: 'xp', amount: 1 },
          requires: { kind: 'trait', traitId: 'athletics', minLevel: 2 },
          grants: [],
        },
      ],
    },
    {
      id: 'stealth',
      name: 'Stealth',
      groupId: 'general',
      summary:
        'Going unnoticed, and noticing those who are trying the same. Its ' +
        'levels get more expensive as they go, which is the usual way to ' +
        'make the top of a skill cost what it is worth.',
      tags: [],
      tiers: [
        {
          level: 1,
          description: 'Move quietly across open ground.',
          cost: { currencyId: 'xp', amount: 1 },
          requires: { kind: 'always' },
          grants: [],
        },
        {
          level: 2,
          description: 'Follow someone through a crowd without being seen to do it.',
          cost: { currencyId: 'xp', amount: 2 },
          requires: { kind: 'trait', traitId: 'stealth', minLevel: 1 },
          grants: [],
        },
        {
          level: 3,
          description: 'Stay hidden in a room that is being searched.',
          cost: { currencyId: 'xp', amount: 3 },
          requires: { kind: 'trait', traitId: 'stealth', minLevel: 2 },
          grants: [],
        },
      ],
    },
    {
      id: 'haggling',
      name: 'Haggling',
      groupId: 'general',
      summary:
        'Talking a price down, or talking a stranger into an introduction. ' +
        'Two levels rather than three: a skill is as deep as it needs to be.',
      tags: [],
      tiers: [
        {
          level: 1,
          description: 'Settle on a fair price where a stranger would be overcharged.',
          cost: { currencyId: 'xp', amount: 1 },
          requires: { kind: 'always' },
          grants: [],
        },
        {
          level: 2,
          description: 'Learn what a seller paid, and what they will take.',
          cost: { currencyId: 'xp', amount: 2 },
          requires: { kind: 'trait', traitId: 'haggling', minLevel: 1 },
          grants: [],
        },
      ],
    },
    {
      id: 'herb-lore',
      name: 'Herb Lore',
      groupId: 'general',
      summary:
        'Knowing what grows nearby and what it does to a person. Tagged ' +
        '"medicine", which is what the Healer’s cost reduction looks for. ' +
        'The modifier names the tag rather than the skill, so anything you ' +
        'tag "medicine" later is discounted too, with no further editing.',
      tags: ['medicine'],
      tiers: [
        {
          level: 1,
          description: 'Identify common plants and which of them are dangerous.',
          cost: { currencyId: 'xp', amount: 2 },
          requires: { kind: 'always' },
          grants: [],
        },
        {
          level: 2,
          description: 'Prepare a remedy that dulls pain for an hour.',
          cost: { currencyId: 'xp', amount: 2 },
          requires: { kind: 'trait', traitId: 'herb-lore', minLevel: 1 },
          grants: [],
          attributes: { calls: 'Soothe' },
        },
        {
          level: 3,
          description: 'Identify a poison from its effects, and prepare its antidote.',
          cost: { currencyId: 'xp', amount: 2 },
          requires: { kind: 'trait', traitId: 'herb-lore', minLevel: 2 },
          grants: [],
          attributes: { calls: 'Cure Poison' },
        },
      ],
    },
    {
      id: 'first-aid',
      name: 'First Aid',
      groupId: 'general',
      summary:
        'Stopping bleeding and setting bones where the injury happened. ' +
        'Level 1 needs a Healer’s Kit, which is a quality rather than a ' +
        'skill — a thing the character has, not a thing they have ' +
        'learned. Level 2 asks a marshal to watch you do it, which is a ' +
        'requirement no software can settle on its own.',
      tags: ['medicine'],
      attributes: {
        safety: 'Describe treatment aloud. No contact with another player.',
      },
      tiers: [
        {
          level: 1,
          description: 'Stop a bleeding wound with sixty seconds of roleplay.',
          cost: { currencyId: 'xp', amount: 2 },
          requires: { kind: 'quality', qualityId: 'healers-kit' },
          grants: [],
          attributes: { calls: 'Stabilise' },
        },
        {
          level: 2,
          description: 'Set a broken limb, or bring back someone who has just stopped.',
          cost: { currencyId: 'xp', amount: 3 },
          requires: {
            kind: 'all',
            of: [
              { kind: 'trait', traitId: 'first-aid', minLevel: 1 },
              {
                kind: 'manual',
                text: 'A marshal watches you perform the treatment once before this is signed off.',
              },
            ],
          },
          grants: [],
          attributes: { calls: 'Revive' },
        },
      ],
    },

    {
      id: 'smithing',
      name: 'Smithing',
      groupId: 'crafts',
      summary:
        'Working metal over heat, from nails upward. Tagged "crafting", ' +
        'and so capped at level 1 during character creation by the rule ' +
        'below. The cap lifts once play begins.',
      tags: ['crafting'],
      tiers: [
        {
          level: 1,
          description: 'Repair a tool. Make anything that is mostly one piece of metal.',
          cost: { currencyId: 'xp', amount: 2 },
          requires: { kind: 'always' },
          grants: [],
        },
        {
          level: 2,
          description: 'Make an edged weapon that will hold its edge.',
          cost: { currencyId: 'xp', amount: 2 },
          requires: { kind: 'trait', traitId: 'smithing', minLevel: 1 },
          grants: [],
        },
        {
          level: 3,
          description: 'Make armour fitted to one person.',
          cost: { currencyId: 'xp', amount: 3 },
          requires: { kind: 'trait', traitId: 'smithing', minLevel: 2 },
          grants: [],
        },
      ],
    },
    {
      id: 'fletching',
      name: 'Fletching',
      groupId: 'crafts',
      summary:
        'Arrows, and the bows that need them. Level 2 requires Smithing 2 ' +
        'as well as Fletching 1, which is how a requirement with more than ' +
        'one part is written: two clauses joined by "all".',
      tags: ['crafting'],
      tiers: [
        {
          level: 1,
          description: 'Make serviceable arrows, and re-string a bow.',
          cost: { currencyId: 'xp', amount: 1 },
          requires: { kind: 'always' },
          grants: [],
        },
        {
          level: 2,
          description: 'Make a bow, and arrows that will punch through a shield.',
          cost: { currencyId: 'xp', amount: 2 },
          requires: {
            kind: 'all',
            of: [
              { kind: 'trait', traitId: 'fletching', minLevel: 1 },
              { kind: 'trait', traitId: 'smithing', minLevel: 2 },
            ],
          },
          grants: [],
        },
      ],
    },

    {
      id: 'tracking',
      name: 'Tracking',
      groupId: 'scoutcraft',
      summary:
        'Reading ground: who passed, how many, how long ago. In a gated ' +
        'group, so it carries no requirement of its own — holding the ' +
        'Scout calling is what opens it.',
      tags: [],
      tiers: [
        {
          level: 1,
          description: 'Follow a clear trail over soft ground.',
          cost: { currencyId: 'xp', amount: 2 },
          requires: { kind: 'always' },
          grants: [],
        },
        {
          level: 2,
          description: 'Say how many passed, and roughly when.',
          cost: { currencyId: 'xp', amount: 2 },
          requires: { kind: 'trait', traitId: 'tracking', minLevel: 1 },
          grants: [],
        },
        {
          level: 3,
          description: 'Follow a trail over stone, or one a day old.',
          cost: { currencyId: 'xp', amount: 3 },
          requires: { kind: 'trait', traitId: 'tracking', minLevel: 2 },
          grants: [],
        },
      ],
    },
    {
      id: 'pathfinding',
      name: 'Pathfinding',
      groupId: 'scoutcraft',
      summary:
        'Finding the way through country nobody has mapped. Gated on ' +
        'Reputation 2 rather than on another skill: a requirement can name ' +
        'a position on a track exactly as easily as it names a skill.',
      tags: [],
      tiers: [
        {
          level: 1,
          description:
            'Lead a group through unmapped country without losing anyone or the day.',
          cost: { currencyId: 'xp', amount: 4 },
          requires: { kind: 'track', trackId: 'reputation', minStep: 2 },
          grants: [],
          attributes: { calls: 'Guide' },
        },
      ],
    },
  ],

  tracks: [
    {
      id: 'reputation',
      name: 'Reputation',
      currencyId: 'standing',
      // A track is a ladder bought with its own currency, separate from
      // skills. This one opens once a character has taken a calling.
      requires: { kind: 'packageTier', tier: 'calling' },
      steps: [
        {
          // Step 0 costs nothing: the calling itself paid for it.
          index: 0,
          label: 'Unknown',
          cost: null,
          unlocks: [],
        },
        {
          index: 1,
          label: 'Known',
          cost: { currencyId: 'standing', amount: 6 },
          unlocks: [],
        },
        {
          index: 2,
          label: 'Trusted',
          cost: { currencyId: 'standing', amount: 10 },
          unlocks: [
            { kind: 'note', text: 'Opens skills that require Reputation 2.' },
          ],
        },
        {
          index: 3,
          label: 'Renowned',
          cost: { currencyId: 'standing', amount: 14 },
          unlocks: [{ kind: 'currency', currencyId: 'coin', amount: 25 }],
        },
      ],
    },
  ],

  purchaseRules: [
    {
      id: 'creation-crafting-cap',
      label: 'Crafts capped at creation',
      message:
        'You may buy no more than the first level of a crafting skill during character creation.',
      phase: 'creation',
      // No skill is named. The rule finds them by tag, so tagging a new
      // skill "crafting" brings it under the cap automatically.
      appliesTo: { tag: 'crafting' },
      maxLevel: 1,
    },
  ],

  sheet: [
    {
      id: 'identity',
      title: 'Identity',
      fields: [
        {
          id: 'name',
          label: 'Character Name',
          type: 'shortText',
          required: true,
        },
        {
          id: 'origin',
          label: 'Where They Are From',
          type: 'shortText',
          required: false,
          helpText: 'A village, a city quarter, a ship. One line is plenty.',
        },
        {
          id: 'concept',
          label: 'Concept',
          type: 'longText',
          required: false,
          helpText:
            'Who they were before play started, and what they want now. ' +
            'These fields are yours to define: add, rename, or remove them ' +
            'in the rules editor.',
        },
      ],
    },
  ],
};
