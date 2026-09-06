/**
 * Eldritch, transcribed from the Player's Guide 2026.
 *
 * GENERATED FILE -- do not edit by hand. Run `node tools/build-eldritch.mjs`
 * after changing tools/eldritch-source.json, which holds the mined tables.
 *
 * This is the app's acceptance criterion rather than a demo: a real published
 * ruleset, at full size, with the awkward rules left in. 201 skills across
 * 40 trees, 401 levels in total. New accounts are seeded with
 * ./demo.ts instead; nothing in the app depends on this file except its tests.
 *
 * Rules that needed a schema feature to exist at all:
 *   - compound prerequisites   ("Artificer - 2 and Bowyer - 1")
 *   - rank gates               (273 clauses -- the commonest kind by far)
 *   - archetype-gated trees    (32 trees, gated on holding the archetype)
 *   - "any skill of a kind"    ("A Weapons Skill", "Any Martial Skill")
 *   - non-skill prerequisites  (a lockpicking kit, a Dusklander background)
 *   - things only staff decide (lore props handed in at a table)
 *   - negative costs           (Chemist Refund returns a point)
 *   - event-dependent caps     (three creation regimes, kept apart by `when`)
 */

import type { Ruleset } from '../rules-schema';

export const eldritch: Ruleset = {
  id: "eldritch",
  name: "Eldritch",
  version: "2026",
  description: "A live action roleplaying game set in the Kingdom of Arnesse. Events take place in the Annwyn. Transcribed from the Player’s Guide 2026 as the acceptance test for this builder: if a rule here cannot be expressed, the schema is missing something.",
  startingBudget: [
    {
      currencyId: "cp",
      amount: 4
    }
  ],
  currencies: [
    {
      id: "cp",
      name: "Character Point",
      abbreviation: "CP",
      kind: "progression"
    },
    {
      id: "influence",
      name: "Influence",
      abbreviation: "Inf",
      kind: "progression"
    },
    {
      id: "coin",
      name: "Silver Dragon",
      abbreviation: "sd",
      kind: "economy"
    }
  ],
  packageTiers: [
    {
      id: "basic",
      name: "Basic Archetype",
      maxHeld: 1
    },
    {
      id: "advanced",
      name: "Advanced Archetype",
      maxHeld: 1
    }
  ],
  packageAttributes: [
    {
      key: "startingEquipment",
      label: "Starting Equipment"
    },
    {
      key: "startingCoin",
      label: "Starting Coin"
    },
    {
      key: "retainerBenefit",
      label: "Retainer Benefit"
    },
    {
      key: "salary",
      label: "Salary"
    }
  ],
  traitAttributes: [],
  qualities: [
    {
      id: "lockpicking-kit",
      name: "Lockpicking Kit",
      category: "Equipment",
      description: "Required to take Disable Device. A player knows whether their character is carrying one.",
      grantedBy: "player"
    },
    {
      id: "dusklander",
      name: "Dusklander Background",
      category: "Background",
      description: "Required to take Gunsmith: the guide notes that your background should indicate where the knowledge came from. Agreed with staff at character approval.",
      grantedBy: "staff"
    },
    {
      id: "created-before-event-5",
      name: "Created before Event 5",
      category: "Character creation",
      description: "Which event a character was made for decides the creation caps that applied to it. Recorded by staff at approval and never changes.",
      grantedBy: "staff"
    },
    {
      id: "created-event-5-to-6",
      name: "Created at Event 5 or 6",
      category: "Character creation",
      description: "See \"Created before Event 5\". Looser caps than the earliest events.",
      grantedBy: "staff"
    }
  ],
  packages: [
    {
      id: "apothecary",
      name: "Apothecary",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 4
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "trait",
          traitId: "alchemy",
          level: 1
        },
        {
          kind: "trait",
          traitId: "herbalism",
          level: 1
        }
      ],
      attributes: {
        startingEquipment: "2 Apothecary Kits, 4 level 1 apothecary schematics of your choice, and enough resources to craft two schematics",
        startingCoin: "None",
        retainerBenefit: "8 Common Herbs",
        salary: "3 silver dragons"
      }
    },
    {
      id: "artificer",
      name: "Artificer",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 4
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "trait",
          traitId: "artificer",
          level: 1
        },
        {
          kind: "choice",
          pick: 1,
          from: [
            {
              kind: "trait",
              traitId: "hunting",
              level: 1
            },
            {
              kind: "trait",
              traitId: "farming",
              level: 1
            }
          ]
        }
      ],
      attributes: {
        startingEquipment: "2 Artificer Kits, 4 level 1 artificer schematics of your choice, and enough resources to craft two schematics",
        startingCoin: "None",
        retainerBenefit: "8 Cloth OR 8 Leather",
        salary: "3 silver dragons"
      },
      notes: "Retained by Cirque only"
    },
    {
      id: "blacksmith",
      name: "Blacksmith",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 4
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "trait",
          traitId: "blacksmith",
          level: 1
        },
        {
          kind: "choice",
          pick: 1,
          from: [
            {
              kind: "trait",
              traitId: "mining",
              level: 1
            },
            {
              kind: "trait",
              traitId: "hunting",
              level: 1
            }
          ]
        }
      ],
      attributes: {
        startingEquipment: "2 Blacksmith Kits, all level 0 blacksmith schematics, and enough resources to craft two schematics",
        startingCoin: "None",
        retainerBenefit: "8 Iron Ingots or 8 Leather",
        salary: "3 silver dragons"
      },
      notes: "Retained by Cirque only"
    },
    {
      id: "bowyer",
      name: "Bowyer",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 4
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "note",
          text: "Artificer 1, Bowyer - 1"
        }
      ],
      attributes: {
        startingEquipment: "2 Bowyer Kits or Artificer Kits (or one of each), both Level 1 Bowyer Schematics, 2 Level 1 Artificer Schematics of your choice, and enough resources to craft two schematics",
        startingCoin: "None",
        retainerBenefit: "8 Refined Wood",
        salary: "3 silver dragons"
      },
      notes: "Retained by Cirque only (or Innis Noble with applicable skill)"
    },
    {
      id: "brigand",
      name: "Brigand",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 2
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "currency",
          currencyId: "coin",
          amount: 20
        },
        {
          kind: "note",
          text: "Income 1 AND Choose 1: 1-Hand Weapon 1, 2-Hand Weapon 1, Archer"
        }
      ],
      attributes: {
        startingEquipment: "8d4 silver dragons in gear",
        startingCoin: "20 silver dragons",
        retainerBenefit: "4d3 silver dragons in wares",
        salary: "3 silver dragons"
      }
    },
    {
      id: "commonfolk",
      name: "Commonfolk",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 1
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "currency",
          currencyId: "coin",
          amount: 20
        },
        {
          kind: "note",
          text: "1 non-crafting, level 1 general skill"
        }
      ],
      attributes: {
        startingEquipment: "20 resources of your choice",
        startingCoin: "20 Silver Dragons",
        retainerBenefit: "8 Silver Dragons",
        salary: "3 Silver Dragons"
      }
    },
    {
      id: "courtier",
      name: "Courtier",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 2
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "note",
          text: "Gain 1 character point to spend on Espionage - 1, Influential - 1, or Income - 1."
        }
      ],
      attributes: {
        startingEquipment: "None",
        startingCoin: "None",
        retainerBenefit: "4 Espionage Points",
        salary: "1 Influence"
      },
      notes: "This archetype can only be granted by a Noble, and can take the place of any other archetype. Characters cannot start the game as Courtiers. 10% reduction on all rank increases while retained by a Noble."
    },
    {
      id: "farmer",
      name: "Farmer",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 1
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "currency",
          currencyId: "coin",
          amount: 20
        },
        {
          kind: "trait",
          traitId: "farming",
          level: 1
        }
      ],
      attributes: {
        startingEquipment: "20 Cloth",
        startingCoin: "20 silver dragons",
        retainerBenefit: "8 Cloth",
        salary: "3 silver dragons"
      }
    },
    {
      id: "feller",
      name: "Feller",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 1
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "currency",
          currencyId: "coin",
          amount: 20
        },
        {
          kind: "trait",
          traitId: "woodcutting",
          level: 1
        }
      ],
      attributes: {
        startingEquipment: "20 Refined Wood",
        startingCoin: "20 silver dragons",
        retainerBenefit: "8 Refined Wood",
        salary: "3 silver dragons"
      }
    },
    {
      id: "gentry",
      name: "Gentry",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 4
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "currency",
          currencyId: "coin",
          amount: 60
        },
        {
          kind: "choice",
          pick: 1,
          from: [
            {
              kind: "trait",
              traitId: "academics",
              level: 1
            },
            {
              kind: "trait",
              traitId: "espionage",
              level: 1
            }
          ]
        },
        {
          kind: "choice",
          pick: 1,
          from: [
            {
              kind: "trait",
              traitId: "income",
              level: 1
            },
            {
              kind: "trait",
              traitId: "influential",
              level: 1
            }
          ]
        },
        {
          kind: "modifier",
          modifier: {
            id: "gentry-rank-discount",
            label: "Gentry rank reduction",
            target: {
              kind: "trackStepCost",
              trackId: "rank"
            },
            operation: "percentReduction",
            value: 25,
            stacking: "successive",
            rounding: "halfUp"
          }
        }
      ],
      attributes: {
        startingEquipment: "None",
        startingCoin: "60 silver dragons",
        retainerBenefit: "2 Influence",
        salary: "4 silver dragons"
      },
      notes: "Gentry get a 25% reduction on all rank increases."
    },
    {
      id: "gunsmith",
      name: "Gunsmith",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 4
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "trait",
          traitId: "artificer",
          level: 1
        },
        {
          kind: "trait",
          traitId: "gunsmith",
          level: 1
        }
      ],
      attributes: {
        startingEquipment: "2 Gunsmith Kits or Artificer Kits (or one of both), both Level 1 Gunsmith Schematics, 2 Level 1 Artificer schematics, and enough resources to craft two schematic",
        startingCoin: "None",
        retainerBenefit: "8 Iron Ingots",
        salary: "3 silver dragons"
      },
      notes: "This archetype can only be retained by Richter nobles with the Pact of Old skill and must be retained by a Richter noble with Pact of Old at every check in."
    },
    {
      id: "herbalist",
      name: "Herbalist",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 1
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "currency",
          currencyId: "coin",
          amount: 20
        },
        {
          kind: "trait",
          traitId: "herbalism",
          level: 1
        }
      ],
      attributes: {
        startingEquipment: "20 Common Herbs",
        startingCoin: "20 silver dragons",
        retainerBenefit: "8 Common Herbs",
        salary: "3 silver dragons"
      }
    },
    {
      id: "hunter",
      name: "Hunter",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 1
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "currency",
          currencyId: "coin",
          amount: 20
        },
        {
          kind: "trait",
          traitId: "hunting",
          level: 1
        }
      ],
      attributes: {
        startingEquipment: "20 LeatherorBow and 2 quivers of Arrows and no Starting Coin",
        startingCoin: "20 silver dragons",
        retainerBenefit: "8 Leather",
        salary: "3 silver dragons"
      }
    },
    {
      id: "merchant",
      name: "Merchant",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 2
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "currency",
          currencyId: "coin",
          amount: 40
        },
        {
          kind: "trait",
          traitId: "income",
          level: 1
        },
        {
          kind: "trait",
          traitId: "gathering",
          level: 1
        }
      ],
      attributes: {
        startingEquipment: "None",
        startingCoin: "40 silver dragons",
        retainerBenefit: "8 Silver Dragons",
        salary: "3 silver dragons"
      },
      notes: "Retained by Cirque only"
    },
    {
      id: "miner",
      name: "Miner",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 1
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "currency",
          currencyId: "coin",
          amount: 20
        },
        {
          kind: "trait",
          traitId: "mining",
          level: 1
        }
      ],
      attributes: {
        startingEquipment: "20 Iron Ingots",
        startingCoin: "20 silver dragons",
        retainerBenefit: "8 Iron Ingots",
        salary: "3 silver dragons"
      }
    },
    {
      id: "physician",
      name: "Physician",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 2
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "currency",
          currencyId: "coin",
          amount: 20
        },
        {
          kind: "trait",
          traitId: "diagnose",
          level: 1
        },
        {
          kind: "trait",
          traitId: "medicine",
          level: 1
        }
      ],
      attributes: {
        startingEquipment: "2 Chirurgeon's Kits",
        startingCoin: "20 silver dragons",
        retainerBenefit: "2 Influence",
        salary: "4 silver dragons"
      }
    },
    {
      id: "scholar",
      name: "Scholar",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 2
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "currency",
          currencyId: "coin",
          amount: 10
        },
        {
          kind: "note",
          text: "Academics - 1 and any Level 1 Lore skill."
        }
      ],
      attributes: {
        startingEquipment: "None",
        startingCoin: "10 silver dragons",
        retainerBenefit: "2 random Level 1 Lore props",
        salary: "4 silver dragons"
      },
      notes: "For the Scholar Retainer Benefit, if you receive a Lore that you already own, you can redraw."
    },
    {
      id: "soldier",
      name: "Soldier",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 2
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "currency",
          currencyId: "coin",
          amount: 50
        },
        {
          kind: "note",
          text: "Choose 2: 1-Hand Weapon 1, 2-Hand Weapon 1, Archer, Tough 1, Shield 1"
        }
      ],
      attributes: {
        startingEquipment: "None",
        startingCoin: "50 silver dragons (40 spent on weapons/armor)",
        retainerBenefit: "4d3 silver dragons in wares",
        salary: "3 silver dragons"
      }
    },
    {
      id: "urchin",
      name: "Urchin",
      tier: "basic",
      cost: {
        currencyId: "cp",
        amount: 1
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "currency",
          currencyId: "coin",
          amount: 20
        },
        {
          kind: "choice",
          pick: 1,
          from: [
            {
              kind: "trait",
              traitId: "espionage",
              level: 1
            },
            {
              kind: "trait",
              traitId: "disable-device",
              level: 1
            }
          ]
        }
      ],
      attributes: {
        startingEquipment: "4 Influence (Espionage chosen) OR 2 Lockpicking Kits (Disable Device chosen)",
        startingCoin: "20 silver dragons",
        retainerBenefit: "4 Espionage Points",
        salary: "1 Influence"
      }
    },
    {
      id: "auron",
      name: "Auron",
      tier: "advanced",
      cost: {
        currencyId: "cp",
        amount: 3
      },
      requires: {
        kind: "not",
        of: {
          kind: "anyPackage",
          packageIds: [
            "courtier",
            "gentry"
          ]
        }
      },
      grants: [
        {
          kind: "note",
          text: "A level 1 skill in the Auron skill tree."
        }
      ],
      attributes: {
        retainerBenefit: "Rank 0: BasicRank 1: Basic + 1 Influence Rank 2: Basic + 2 Influence Rank 3: Basic + 3 Influence",
        salary: "Rank 0: BasicRank 1: Basic + 2 silver dragons Rank 2: Basic + 4 silver dragons Rank 3: Basic + 6 silver dragons"
      },
      notes: "Basic Archetypes that cost 1 CP pay -15% on all Rank advancement costs."
    },
    {
      id: "cirque",
      name: "Cirque",
      tier: "advanced",
      cost: {
        currencyId: "cp",
        amount: 3
      },
      requires: {
        kind: "not",
        of: {
          kind: "anyPackage",
          packageIds: [
            "courtier",
            "gentry"
          ]
        }
      },
      grants: [
        {
          kind: "note",
          text: "A level 1 skill in your Primary Cirque skill tree or Cirque general skills."
        }
      ],
      attributes: {
        retainerBenefit: "Rank 0: BasicRank 1: Basic + 4 resources Rank 2: Basic + 8 resources Rank 3: Basic + 12 resources",
        salary: "Rank 0: BasicRank 1: Basic + 2 silver dragons Rank 2: Basic + 4 silver dragons Rank 3: Basic + 6 silver dragons"
      },
      notes: "Merchant, Blacksmith, Artificer, Bowyer, and Urchin Basic Archetypes pay -15% on all Rank advancement costs."
    },
    {
      id: "knight",
      name: "Knight",
      tier: "advanced",
      cost: {
        currencyId: "cp",
        amount: 3
      },
      requires: {
        kind: "anyPackage",
        packageIds: [
          "gentry",
          "physician",
          "soldier"
        ]
      },
      grants: [
        {
          kind: "note",
          text: "A level 1 skill in your Primary Knight skill tree or Knight general skills."
        }
      ],
      attributes: {
        retainerBenefit: "Rank 0: BasicRank 1: Basic + 1 Influence Rank 2: Basic + 2 Influence Rank 3: Basic + 3 Influence",
        salary: "Rank 0: BasicRank 1: Basic + 2 silver dragons Rank 2: Basic + 4 silver dragons Rank 3: Basic + 6 silver dragons"
      }
    },
    {
      id: "magister",
      name: "Magister",
      tier: "advanced",
      cost: {
        currencyId: "cp",
        amount: 3
      },
      requires: {
        kind: "anyPackage",
        packageIds: [
          "scholar",
          "apothecary",
          "physician",
          "gentry"
        ]
      },
      grants: [
        {
          kind: "note",
          text: "A level 1 skill in your Primary Apotheca skill tree or Apotheca general skills."
        }
      ],
      attributes: {
        retainerBenefit: "Rank 0: BasicRank 1: Basic + 4 resources Rank 2: Basic + 8 resources Rank 3: Basic + 12 resources",
        salary: "Rank 0: BasicRank 1: Basic + 2 silver dragons Rank 2: Basic + 4 silver dragons Rank 3: Basic + 6 silver dragons"
      }
    },
    {
      id: "noble",
      name: "Noble",
      tier: "advanced",
      cost: {
        currencyId: "cp",
        amount: 6
      },
      requires: {
        kind: "anyPackage",
        packageIds: [
          "courtier",
          "gentry"
        ]
      },
      grants: [
        {
          kind: "note",
          text: "2 level 1 skills in the General Noble skill tree and 1 from a chosen House skill tree."
        }
      ],
      attributes: {
        retainerBenefit: "Rank 0: BasicRank 1: Basic + 1 Influence OR 4 silver dragons Rank 2: Basic + 2 Influence OR 8 silver dragonsRank 3: Basic + 3 Influence OR 12 silver dragons",
        salary: "Rank 0: BasicRank 1: Basic + 2 silver dragons Rank 2: Basic + 4 silver dragons Rank 3: Basic + 6 silver dragons"
      }
    },
    {
      id: "veteran",
      name: "Veteran",
      tier: "advanced",
      cost: {
        currencyId: "cp",
        amount: 1
      },
      requires: {
        kind: "always"
      },
      grants: [
        {
          kind: "note",
          text: "A level 1 skill in your Primary Veteran skill tree."
        }
      ],
      attributes: {
        retainerBenefit: "Rank 2: Basic + 8 resources OR 8 silver dragonsRank 3: Basic + 12 resources OR 12 silver dragons",
        salary: "Rank 2: Basic + 4 silver dragons Rank 3: Basic + 6 silver dragons"
      },
      notes: "Start at Rank 2 instead of Rank 1.Basic Archetypes that cost 1 or 2 CP pay -10% on all Rank advancement costs."
    },
    {
      id: "vigil",
      name: "Vigil",
      tier: "advanced",
      cost: {
        currencyId: "cp",
        amount: 3
      },
      requires: {
        kind: "anyPackage",
        packageIds: [
          "courtier",
          "gentry"
        ]
      },
      grants: [
        {
          kind: "note",
          text: "A level 1 skill in your Primary Vigil skill tree or Vigil general skills."
        }
      ],
      attributes: {
        retainerBenefit: "Rank 0: BasicRank 1: Basic + 2 Espionage points Rank 2: Basic + 4 Espionage points Rank 3: Basic + 6 espionage points",
        salary: "Rank 0: BasicRank 1: Basic + 2 silver dragons Rank 2: Basic + 4 silver dragons Rank 3: Basic + 6 silver dragons"
      }
    }
  ],
  traitGroups: [
    {
      id: "general",
      name: "General Skills",
      description: "Available to every character, whatever their archetype."
    },
    {
      id: "martial",
      name: "Martial Skills",
      description: "Combat training. Attack skills strike; defend skills absorb. Several advanced skills require any one of these rather than a named skill."
    },
    {
      id: "lore",
      name: "Lore Skills",
      description: "Bought with lore props found in play rather than with character points. Reading a lore prop also requires Academics at its level."
    },
    {
      id: "auron",
      name: "Auron Skills",
      description: "Open only to characters who hold the Auron archetype.",
      requires: {
        kind: "package",
        packageId: "auron"
      }
    },
    {
      id: "auron-general",
      name: "Auron · General",
      parentId: "auron"
    },
    {
      id: "cirque",
      name: "Cirque Skills",
      description: "Open only to characters who hold the Cirque archetype.",
      requires: {
        kind: "package",
        packageId: "cirque"
      }
    },
    {
      id: "cirque-general",
      name: "Cirque · General",
      parentId: "cirque"
    },
    {
      id: "cirque-troupe",
      name: "Cirque · Troupe",
      parentId: "cirque"
    },
    {
      id: "cirque-menagerie",
      name: "Cirque · Menagerie",
      parentId: "cirque"
    },
    {
      id: "knight",
      name: "Knight Skills",
      description: "Open only to characters who hold the Knight archetype.",
      requires: {
        kind: "package",
        packageId: "knight"
      }
    },
    {
      id: "knight-general",
      name: "Knight · General",
      parentId: "knight"
    },
    {
      id: "knight-martial",
      name: "Knight · Martial",
      parentId: "knight"
    },
    {
      id: "knight-mercy",
      name: "Knight · Mercy",
      parentId: "knight"
    },
    {
      id: "magister",
      name: "Magister Skills",
      description: "Open only to characters who hold the Magister archetype.",
      requires: {
        kind: "package",
        packageId: "magister"
      }
    },
    {
      id: "magister-general",
      name: "Magister · General",
      parentId: "magister"
    },
    {
      id: "magister-scholar",
      name: "Magister · Scholar",
      parentId: "magister"
    },
    {
      id: "magister-alchemist",
      name: "Magister · Alchemist",
      parentId: "magister"
    },
    {
      id: "magister-chirurgeon",
      name: "Magister · Chirurgeon",
      parentId: "magister"
    },
    {
      id: "noble",
      name: "Noble Skills",
      description: "Open only to characters who hold the Noble archetype.",
      requires: {
        kind: "package",
        packageId: "noble"
      }
    },
    {
      id: "noble-general",
      name: "Noble · General",
      parentId: "noble"
    },
    {
      id: "noble-aragon",
      name: "Noble · Aragon",
      parentId: "noble"
    },
    {
      id: "noble-bannon",
      name: "Noble · Bannon",
      parentId: "noble"
    },
    {
      id: "noble-blayne",
      name: "Noble · Blayne",
      parentId: "noble"
    },
    {
      id: "noble-corveaux",
      name: "Noble · Corveaux",
      parentId: "noble"
    },
    {
      id: "noble-hale",
      name: "Noble · Hale",
      parentId: "noble"
    },
    {
      id: "noble-innis",
      name: "Noble · Innis",
      parentId: "noble"
    },
    {
      id: "noble-richter",
      name: "Noble · Richter",
      parentId: "noble"
    },
    {
      id: "noble-rourke",
      name: "Noble · Rourke",
      parentId: "noble"
    },
    {
      id: "noble-twilight-empire",
      name: "Noble · Twilight Empire",
      parentId: "noble"
    },
    {
      id: "veteran",
      name: "Veteran Skills",
      description: "Open only to characters who hold the Veteran archetype.",
      requires: {
        kind: "package",
        packageId: "veteran"
      }
    },
    {
      id: "veteran-academic",
      name: "Veteran · Academic",
      parentId: "veteran"
    },
    {
      id: "veteran-artisan",
      name: "Veteran · Artisan",
      parentId: "veteran"
    },
    {
      id: "veteran-burgher",
      name: "Veteran · Burgher",
      parentId: "veteran"
    },
    {
      id: "veteran-peasant",
      name: "Veteran · Peasant",
      parentId: "veteran"
    },
    {
      id: "veteran-scoundrel",
      name: "Veteran · Scoundrel",
      parentId: "veteran"
    },
    {
      id: "veteran-soldier",
      name: "Veteran · Soldier",
      parentId: "veteran"
    },
    {
      id: "vigil",
      name: "Vigil Skills",
      description: "Open only to characters who hold the Vigil archetype.",
      requires: {
        kind: "package",
        packageId: "vigil"
      }
    },
    {
      id: "vigil-general",
      name: "Vigil · General",
      parentId: "vigil"
    },
    {
      id: "vigil-justicar",
      name: "Vigil · Justicar",
      parentId: "vigil"
    },
    {
      id: "vigil-sentinel",
      name: "Vigil · Sentinel",
      parentId: "vigil"
    }
  ],
  traits: [
    {
      id: "academics",
      name: "Academics",
      groupId: "general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Academics 1 - Academics represents your ability to pour through tomes and elicit information from texts. Can read and write. Access lore noted as level 1 as long as you have signed a syllabus in the relevant subject(s) and meet any other requirements on the lore prop. See additional details on Academics and Lore.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Academics 2 - Access lore noted as level 2, as long as you have leveled the relevant lore skill(s) to 2 and meet any other requirements on the lore prop. See additional details on leveling lore skills.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "academics",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Academics 3 - Access lore noted as level 3, as long as you have leveled relevant lore skill(s) to 3 and meet any other requirements on the lore prop. See additional details on leveling lore skills.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "academics",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "alchemy",
      name: "Alchemy",
      groupId: "general",
      tags: [
        "crafting"
      ],
      tiers: [
        {
          level: 1,
          description: "(Crafting) Can use level 1 schematics to create alchemy substances. See additional details about crafting.",
          cost: {
            currencyId: "cp",
            amount: 3
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Can use level 2 schematics to create alchemy substances. Gain one level 2 schematic of your choice at the next Check In after purchasing this skill.",
          cost: {
            currencyId: "cp",
            amount: 3
          },
          requires: {
            kind: "trait",
            traitId: "alchemy",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Can use level 3 schematics to create alchemy substances. Gain one level 3 schematic of your choice at the next Check In after purchasing this skill.",
          cost: {
            currencyId: "cp",
            amount: 3
          },
          requires: {
            kind: "trait",
            traitId: "alchemy",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "artificer",
      name: "Artificer",
      groupId: "general",
      tags: [
        "crafting"
      ],
      tiers: [
        {
          level: 1,
          description: "(Crafting) Can use level 1 schematics to create artificer goods. See additional details about crafting.",
          cost: {
            currencyId: "cp",
            amount: 3
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Can use level 2 schematics to create artificer goods. Gain one level 2 schematic of your choice at the next Check In after purchasing this skill.",
          cost: {
            currencyId: "cp",
            amount: 3
          },
          requires: {
            kind: "trait",
            traitId: "artificer",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Can use level 3 schematics to create artificer goods. Gain one level 3 schematic of your choice at the next Check In after purchasing this skill.",
          cost: {
            currencyId: "cp",
            amount: 3
          },
          requires: {
            kind: "trait",
            traitId: "artificer",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "blacksmith",
      name: "Blacksmith",
      groupId: "general",
      tags: [
        "crafting"
      ],
      tiers: [
        {
          level: 1,
          description: "(Crafting) Can repair all weapons and armor. Can use level 1 schematics to create Blacksmith goods. See additional details about crafting.",
          cost: {
            currencyId: "cp",
            amount: 3
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Can use level 2 schematics to create Blacksmith goods. Gain one level 2 schematic of your choice at the next Check In after purchasing this skill.",
          cost: {
            currencyId: "cp",
            amount: 3
          },
          requires: {
            kind: "trait",
            traitId: "blacksmith",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Can use level 3 schematics to create Blacksmith goods. Gain one level 3 schematic of your choice at the next Check In after purchasing this skill.",
          cost: {
            currencyId: "cp",
            amount: 3
          },
          requires: {
            kind: "trait",
            traitId: "blacksmith",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "bowyer",
      name: "Bowyer",
      groupId: "general",
      tags: [
        "crafting"
      ],
      tiers: [
        {
          level: 1,
          description: "(Crafting) Can make bows and arrows, and repair bows. May acquire the Arrows schematic or the Bow schematic. See additional details about crafting.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "trait",
            traitId: "artificer",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 2,
          description: "Can make improved bows. The schematic for improved bows will be provided upon purchasing this skill.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "artificer",
                minLevel: 2
              },
              {
                kind: "trait",
                traitId: "bowyer",
                minLevel: 1
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Can make masterwork bows. The schematic for masterwork bows will be provided upon purchasing this skill.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "trait",
            traitId: "bowyer",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "diagnose",
      name: "Diagnose",
      groupId: "general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Determine whether another character is poisoned or diseased and access the information on a corresponding poison or disease card. Allows you to diagnose level one diseases and poisons. See additional details.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Diagnose level 2 diseases and poisons.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "trait",
            traitId: "diagnose",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Diagnose level 3 diseases and poisons.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "trait",
            traitId: "diagnose",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "disable-device",
      name: "Disable Device",
      groupId: "general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Allows the character to pick locks by using a lock-picking set. When drawing from a lock-picking deck, the character can use any letter in the Level 1 row. See additional details.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "quality",
            qualityId: "lockpicking-kit"
          },
          grants: []
        },
        {
          level: 2,
          description: "When drawing from a lockpicking deck, the character can use any letters in the Level 1 and 2 rows.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "disable-device",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "When drawing from a lockpicking deck, the character can use any letters in the Level 1, 2, and 3 rows.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "disable-device",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "espionage",
      name: "Espionage",
      groupId: "general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 2 Espionage points per event at check in. See additional details.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 4 Espionage points per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "trait",
            traitId: "espionage",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 6 Espionage points per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "trait",
            traitId: "espionage",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "farming",
      name: "Farming",
      groupId: "general",
      tags: [
        "gathering"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain 4 Cloth per event at check in. Access Farming nodes at events. See additional details.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 12 Cloth per event at check in. Access more resources from Farming nodes at events",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "farming",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 20 Cloth per event at check in. Access more resources from Farming nodes at events",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "farming",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "gathering",
      name: "Gathering",
      groupId: "general",
      tags: [
        "gathering"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain 4 random resources per event at check in. Access Gathering nodes at events. See additional details.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 12 random resources per event. Access more resources from Gathering nodes at events.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "gathering",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 20 random resources per event at check in. Access more resources from Gathering nodes at events.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "gathering",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "gunsmith",
      name: "Gunsmith",
      groupId: "general",
      tags: [
        "crafting"
      ],
      tiers: [
        {
          level: 1,
          description: "(Crafting) Can make ammunition and repair firearms. The schematic for bullets will be provided upon purchasing this skill. See additional details about crafting. Your background should indicate a connection to House Richter, because they control knowledge of gunsmithing.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "artificer",
                minLevel: 1
              },
              {
                kind: "quality",
                qualityId: "dusklander"
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "Can make pistols. The schematic for pistols will be provided upon purchasing this skill.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "blacksmith",
                minLevel: 1
              },
              {
                kind: "trait",
                traitId: "gunsmith",
                minLevel: 1
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Can make masterwork pistols and rifles. The schematic for both will be provided upon purchasing this skill.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "trait",
            traitId: "gunsmith",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "herbalism",
      name: "Herbalism",
      groupId: "general",
      tags: [
        "gathering"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain 4 random apothecary reagents per event at check in. Access Herbalism nodes at events. See additional details. You can pull reagents from the level 1 reagents box.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 12 random apothecary reagents per event at check in. You may now pull reagents from the level 1 and level 2 reagents boxes. You can choose which box to pull from for each of your 12 reagents. Access more resources from Herbalism nodes at events.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "herbalism",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 20 random apothecary reagents per event at check in. You may now pull reagents from the level 1, level 2, and level 3 reagents boxes. You can choose which box to pull from for each of your 20 reagents. Access more resources from Herbalism nodes at events.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "herbalism",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "hunting",
      name: "Hunting",
      groupId: "general",
      tags: [
        "gathering"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain 4 leather per event at check in. Access Hunting nodes at events. See additional details.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 12 leather per event at check in. Access more resources from Hunting nodes at events.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "hunting",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 20 leather per event at check in. Access more resources from Hunting nodes at events.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "hunting",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "income",
      name: "Income",
      groupId: "general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 4 silver dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 12 silver dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "income",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 20 silver dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "income",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "influential",
      name: "Influential",
      groupId: "general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 1 Influence per event at check in. See additional details.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 3 Influence per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "influential",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 5 Influence per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "influential",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "medicine",
      name: "Medicine",
      groupId: "general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Halt a player's bleeding count and after 10 minutes of roleplay, restore a player from the Bleeding condition to the Wounded condition. This count must go uninterrupted or the bleeding count will start again. See additional details.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Halt a player's bleeding count and after 8 minutes of uninterrupted roleplay, restore a player from the Bleeding condition to the Wounded condition.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "medicine",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Halt a player's bleeding count and after 6 minutes of uninterrupted roleplay, restore a player from the Bleeding condition to the Wounded condition.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "medicine",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "mining",
      name: "Mining",
      groupId: "general",
      tags: [
        "gathering"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain 4 iron ingots per event at check in. Access Mining nodes at events. See additional details.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 12 iron ingots per event at check in. Access more resources from Mining nodes at events.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "mining",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 20 iron ingots per event at check in. Access more resources from mining nodes at events.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "mining",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "perception",
      name: "Perception",
      groupId: "general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain specific information on an in-game space labeled with Perception 1. Information will be represented as business card sized tags or letter sized documents. See additional details.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain access to information gated by Perception 2.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "perception",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain access to information gated by Perception 3.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "perception",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "tracking",
      name: "Tracking",
      groupId: "general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Determine the direction a being or object was moving overland labeled with Tracking 1. Information will be represented by stakes with colored tape or business card sized tags. See additional details.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Track trails labeled with Tracking 2.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "tracking",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Track trails labeled with Tracking 3.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "tracking",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "woodcutting",
      name: "Woodcutting",
      groupId: "general",
      tags: [
        "gathering"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain 4 refined wood per event at check in. Access Woodcutting nodes at events. See additional details.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 12 refined wood per event at check in. Access additional resources from Woodcutting nodes at events.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "woodcutting",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 20 refined wood per event at check in. Access even more additional resources from Woodcutting nodes at events.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "woodcutting",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "archer",
      name: "Archer",
      groupId: "martial",
      tags: [
        "attack"
      ],
      tiers: [
        {
          level: 1,
          description: "Can use a bow. Gain access to the Stun active martial skill with the bow. May use one Stun call with a bow per Refresh. Arrows ignore Armor Value (AV) and Tough on their targets.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        }
      ]
    },
    {
      id: "armor-proficiency",
      name: "Armor Proficiency",
      groupId: "martial",
      tags: [
        "defend"
      ],
      tiers: [
        {
          level: 1,
          description: "Can wear armor of any type. While wearing light armor (chain shirt or leather), gain the armor’s full Listed Armor Value. While wearing medium (coat of plates), your effective AV is the listed AV of light armor of that same tier, or 3 AV if medium, and 4 AV if heavy.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Get maximum AV from any light or medium armor worn. While wearing heavy armor, your effective AV is the listed AV of medium armor of that same tier, or 4 AV, whichever is higher.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "armor-proficiency",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Get maximum AV out of any armor worn, light, medium, or heavy.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "armor-proficiency",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "combat-agility",
      name: "Combat Agility",
      groupId: "martial",
      tags: [
        "defend"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain +1 Armor Value (AV) on light and medium armor.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "trait",
            traitId: "armor-proficiency",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +1 AV on light and medium armor.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "trait",
            traitId: "combat-agility",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +1 AV on light and medium armor.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "trait",
            traitId: "combat-agility",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "gunner",
      name: "Gunner",
      groupId: "martial",
      tags: [
        "attack"
      ],
      tiers: [
        {
          level: 1,
          description: "May use an approved prop firearm in combat. Bullets send targets directly into their Dying Count regardless of hit location, Tough, or Armor. Bullets apply one Sunder to shields that are hit.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        }
      ]
    },
    {
      id: "master-of-arms",
      name: "Master of Arms",
      groupId: "martial",
      tags: [
        "attack"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain +1 use of any ONE active martial skill that you have access to, per Refresh. Can wield a one-handed weapon in both hands, except for a bow.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "any",
            of: [
              {
                kind: "trait",
                traitId: "archer",
                minLevel: 1
              },
              {
                kind: "trait",
                traitId: "gunner",
                minLevel: 1
              },
              {
                kind: "trait",
                traitId: "one-handed-weapons",
                minLevel: 1
              },
              {
                kind: "trait",
                traitId: "two-handed-weapons",
                minLevel: 1
              },
              {
                kind: "trait",
                traitId: "shields",
                minLevel: 1
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +1 use of any ONE active martial skill that you have access to, per Refresh. You may choose the same or different active martial skills for each level of Master of Arms each Refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "master-of-arms",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +1 use of any ONE active martial skill that you have access to, per Refresh. You may choose the same or different active martial skills for each level of Master of Arms each Refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "master-of-arms",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "one-handed-weapons",
      name: "One-Handed Weapons",
      groupId: "martial",
      tags: [
        "attack"
      ],
      tiers: [
        {
          level: 1,
          description: "May use a small or medium weapon. Gain access to the Stun active martial skill with a small or medium weapon. May use one Stun call with a small or medium weapon per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain access to the Stagger active martial skill. May use one Stagger call with a small or medium weapon per refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "one-handed-weapons",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain access to the Disarm active martial skill. May use one Disarm call with a small or medium weapon per refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "one-handed-weapons",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "resilience",
      name: "Resilience",
      groupId: "martial",
      tags: [
        "defend"
      ],
      tiers: [
        {
          level: 1,
          description: "Add 1 minute to the duration of your Bleeding count.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Add 3 minutes to the duration of your Bleeding count.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "resilience",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Add 5 minutes to the duration of your Bleeding count.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "resilience",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "shields",
      name: "Shields",
      groupId: "martial",
      tags: [
        "defend"
      ],
      tiers: [
        {
          level: 1,
          description: "May use shields. Shields cannot be disarmed. Shields can block bullets but receive a Sunder when they do. Shields can block all weapon strikes and arrows.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain access to the Stun active martial skill. May use one Stun call with your melee weapon, per Refresh. Please do not shield bash other people; you may instead mime the Stun with your shield while delivering it with your weapon, if you wish. You may call the Stun from the front or back of your opponent.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "shields",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain access to the Resist active martial skill. May use one Resist call with a shield per refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "shields",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "tough",
      name: "Tough",
      groupId: "martial",
      tags: [
        "defend"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain +1 point to your Armor Value (AV) total. This is your character’s natural toughness and does not require armor to be worn. Tough points refresh at the same time as all other active martial skills.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +1 point to your AV total.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "trait",
            traitId: "tough",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +1 point to your AV total.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "trait",
            traitId: "tough",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "two-handed-weapons",
      name: "Two-Handed Weapons",
      groupId: "martial",
      tags: [
        "attack"
      ],
      tiers: [
        {
          level: 1,
          description: "May use large weapons. Two-handed weapons cannot be disarmed.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "always"
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain access to the Sunder active martial skill. May use one Sunder call with a large weapon per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "two-handed-weapons",
            minLevel: 1
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain access to the Cleave active martial skill. May use one Cleave call with a large weapon per refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "trait",
            traitId: "two-handed-weapons",
            minLevel: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "history",
      name: "History",
      groupId: "lore",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Information about Arnesse’s past, be it locations, people, or events.",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "manual",
            text: "Hand in a History Syllabus. There is no CP cost for a lore skill found this way."
          },
          grants: []
        },
        {
          level: 2,
          description: "",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "history",
                minLevel: 1
              },
              {
                kind: "manual",
                text: "Redeem 6 unique History - 1 lore props with staff. Duplicates cannot be used, and redeemed props are signed."
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "history",
                minLevel: 2
              },
              {
                kind: "manual",
                text: "Redeem 9 unique History - 2 lore props with staff. Duplicates cannot be used, and redeemed props are signed."
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "religion",
      name: "Religion",
      groupId: "lore",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Information about the faiths of Arnesse.",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "manual",
            text: "Hand in a Religion Syllabus. There is no CP cost for a lore skill found this way."
          },
          grants: []
        },
        {
          level: 2,
          description: "",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "religion",
                minLevel: 1
              },
              {
                kind: "manual",
                text: "Redeem 6 unique Religion - 1 lore props with staff. Duplicates cannot be used, and redeemed props are signed."
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "religion",
                minLevel: 2
              },
              {
                kind: "manual",
                text: "Redeem 9 unique Religion - 2 lore props with staff. Duplicates cannot be used, and redeemed props are signed."
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "languages",
      name: "Languages",
      groupId: "lore",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Information about the languages, grammar, and related arts of Arnesse. Note that the primary language spoken in the kingdom is the common tongue, which a player must have Academics 1 to read.",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "manual",
            text: "Hand in a Languages Syllabus. There is no CP cost for a lore skill found this way."
          },
          grants: []
        },
        {
          level: 2,
          description: "",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "languages",
                minLevel: 1
              },
              {
                kind: "manual",
                text: "Redeem 6 unique Languages - 1 lore props with staff. Duplicates cannot be used, and redeemed props are signed."
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "languages",
                minLevel: 2
              },
              {
                kind: "manual",
                text: "Redeem 9 unique Languages - 2 lore props with staff. Duplicates cannot be used, and redeemed props are signed."
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "the-vale",
      name: "The Vale",
      groupId: "lore",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "The lore of the Vale is any information that pertains to geography, demographics, social customs, or current events of the day.",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "manual",
            text: "Hand in a The Vale Syllabus. There is no CP cost for a lore skill found this way."
          },
          grants: []
        },
        {
          level: 2,
          description: "",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "the-vale",
                minLevel: 1
              },
              {
                kind: "manual",
                text: "Redeem 6 unique The Vale - 1 lore props with staff. Duplicates cannot be used, and redeemed props are signed."
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "the-vale",
                minLevel: 2
              },
              {
                kind: "manual",
                text: "Redeem 9 unique The Vale - 2 lore props with staff. Duplicates cannot be used, and redeemed props are signed."
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "the-welkin",
      name: "The Welkin",
      groupId: "lore",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "The lore of the Welkin is any information about the otherworldly realms and their denizens beyond the Vale.",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "manual",
            text: "Hand in a The Welkin Syllabus. There is no CP cost for a lore skill found this way."
          },
          grants: []
        },
        {
          level: 2,
          description: "",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "the-welkin",
                minLevel: 1
              },
              {
                kind: "manual",
                text: "Redeem 6 unique The Welkin - 1 lore props with staff. Duplicates cannot be used, and redeemed props are signed."
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "the-welkin",
                minLevel: 2
              },
              {
                kind: "manual",
                text: "Redeem 9 unique The Welkin - 2 lore props with staff. Duplicates cannot be used, and redeemed props are signed."
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "mythology",
      name: "Mythology",
      groupId: "lore",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Mythology is the stories and lore of the ancient past. It is more tales than history, but those tales can and do often contain a grain of truth. Mythology can contain lore about heroes, items, places, or even entire civilizations.",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "manual",
            text: "Hand in a Mythology Syllabus. There is no CP cost for a lore skill found this way."
          },
          grants: []
        },
        {
          level: 2,
          description: "",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "mythology",
                minLevel: 1
              },
              {
                kind: "manual",
                text: "Redeem 6 unique Mythology - 1 lore props with staff. Duplicates cannot be used, and redeemed props are signed."
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "mythology",
                minLevel: 2
              },
              {
                kind: "manual",
                text: "Redeem 9 unique Mythology - 2 lore props with staff. Duplicates cannot be used, and redeemed props are signed."
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "metaphysics",
      name: "Metaphysics",
      groupId: "lore",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Metaphysics is the lore of the “eldritch”; the strange and unusual phenomena that manifests in the present day. It is beyond that which is understood by science; the unexplained, the occult, and the seemingly magical.",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "manual",
            text: "Hand in a Metaphysics Syllabus. There is no CP cost for a lore skill found this way."
          },
          grants: []
        },
        {
          level: 2,
          description: "",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "metaphysics",
                minLevel: 1
              },
              {
                kind: "manual",
                text: "Redeem 6 unique Metaphysics - 1 lore props with staff. Duplicates cannot be used, and redeemed props are signed."
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "metaphysics",
                minLevel: 2
              },
              {
                kind: "manual",
                text: "Redeem 9 unique Metaphysics - 2 lore props with staff. Duplicates cannot be used, and redeemed props are signed."
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "acolytes",
      name: "Acolytes",
      groupId: "auron-general",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain +2 Retainer slots.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "faithful",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "bless",
      name: "Bless",
      groupId: "auron-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May use the Bless skill 1 time per event. After an Auron appropriate blessing, the target may receive one temporary active martial skill use. This should be one the target player already has access to through their martial skills.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "May use the Bless skill 2 times per event.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "bless",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "May use the Bless skill 3 times per event.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "bless",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "bulwark-of-faith",
      name: "Bulwark of Faith",
      groupId: "auron-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May use the Bulwark of Faith skill 1 time per Refresh. See additional details below this table.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "May use the Bulwark of Faith skill 2 times per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "bulwark-of-faith",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "May use the Bulwark of Faith skill 3 times per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "bulwark-of-faith",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "dawn-ceremony",
      name: "Dawn Ceremony",
      groupId: "auron-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May perform a Dawn Ceremony once per event as outlined in the Auron packet. After doing so, all in attendance of the ceremony receive one temporary point of Tough and may negate the Fear effect once anytime throughout the rest of the event. The Tough and negate Fear granted in this way do not stack with Bulwark of Faith and Embolden, respectively.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "donations",
      name: "Donations",
      groupId: "auron-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 8 silver dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 24 silver dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "donations",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 4 gold dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "donations",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "embolden",
      name: "Embolden",
      groupId: "auron-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May use the Embolden skill 1 time per Refresh. See additional details below this table.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "May use the Embolden skill 2 times per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "embolden",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "May use the Embolden skill 3 times per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "embolden",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "faithful",
      name: "Faithful",
      groupId: "auron-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain +1 Retainer slot.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +1 Retainer slot.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "faithful",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +1 Retainer slot.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "faithful",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "the-first-estate",
      name: "The First Estate",
      groupId: "auron-general",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain 2 Influence per Retainer at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "influential",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "tithes",
      name: "Tithes",
      groupId: "auron-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "150% Retainer Benefit from retainers with the Commonfolk, Urchin, Farmer, Feller, Miner, and Hunter archetypes at check in. If the retainer has the Veteran or no advanced archetype, you gain 175% instead.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 200% more Retainer Benefit from retainers with the Commonfolk, Urchin, Farmer, Feller, Miner, and Hunter archetypes at check in. If the retainer has the Veteran or no advanced archetype, you gain 250% instead.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "tithes",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 250% more Retainer Benefit from retainers with the Commonfolk, Urchin, Farmer, Feller, Miner, and Hunter archetypes at check in. If the retainer has the Veteran or no advanced archetype, you gain 300% instead.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "tithes",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "bribery",
      name: "Bribery",
      groupId: "cirque-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May convert 5 silver dragons to 1 Influence per event at check in. Up to 3 Influence may be created in this way.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "gossip",
      name: "Gossip",
      groupId: "cirque-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain +2 Espionage points at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +4 Espionage points at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "gossip",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +6 Espionage points at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "gossip",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "guildmaster",
      name: "Guildmaster",
      groupId: "cirque-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain +1 Retainer slot.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +1 Retainer slot.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "guildmaster",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +1 Retainer slot.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "guildmaster",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "prestige",
      name: "Prestige",
      groupId: "cirque-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 3 silver dragons for each Retainer at check in. You may take this payout in any mix of resources and coin, using market prices.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 7 silver dragons for each Retainer at check in. You may take this payout in any mix of resources and coin, using market prices.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "prestige",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 10 silver dragons for each Retainer at check in. You may take this payout in any mix of resources and coin, using market prices.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "prestige",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "profiteer",
      name: "Profiteer",
      groupId: "cirque-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 8 silver dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 24 silver dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "profiteer",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 4 gold dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "profiteer",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "the-boss",
      name: "The Boss",
      groupId: "cirque-general",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain +2 Retainer slots.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "guildmaster",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "artisan",
      name: "Artisan",
      groupId: "cirque-troupe",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "When purchasing Blacksmithing or Artificer crafting skill at levels 2 or 3, it costs one less CP. You may also gain an additional Schematic of the same level at random.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: [
            {
              kind: "modifier",
              modifier: {
                id: "artisan-blacksmith-discount",
                label: "Artisan (Blacksmith)",
                target: {
                  kind: "traitCost",
                  traitId: "blacksmith",
                  minLevel: 2
                },
                operation: "flatReduction",
                value: 1,
                stacking: "successive",
                rounding: "halfUp"
              }
            },
            {
              kind: "modifier",
              modifier: {
                id: "artisan-artificer-discount",
                label: "Artisan (Artificer)",
                target: {
                  kind: "traitCost",
                  traitId: "artificer",
                  minLevel: 2
                },
                operation: "flatReduction",
                value: 1,
                stacking: "successive",
                rounding: "halfUp"
              }
            }
          ]
        }
      ]
    },
    {
      id: "devotion-to-practice",
      name: "Devotion to Practice",
      groupId: "cirque-troupe",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event, you may copy one Schematic that you own OR acquire one Schematic of your choice of a craft you own. The maximum level of any acquired Schematic from this skill is Level 1.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Once per event, you may copy one Schematic that you own OR acquire one Schematic of your choice of a craft you own. The maximum level of any acquired Schematic from this skill is Level 2.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "devotion-to-practice",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Once per event, you may copy one Schematic that you own OR acquire one Schematic of your choice of a craft you own. The maximum level of any acquired Schematic from this skill is Level 3.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "devotion-to-practice",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "efficient-craftsman",
      name: "Efficient Craftsman",
      groupId: "cirque-troupe",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Get a 25% reduction on crafting costs (use true rounding: =\\1.4 round down; \\=1.5 round up). You may choose which resources to save as a result.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "efficient-gatherer",
      name: "Efficient Gatherer",
      groupId: "cirque-troupe",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 6 additional resources of your choosing at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "gathering",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 16 additional resources of your choosing at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "efficient-gatherer",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 26 additional resources of your choosing at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "efficient-gatherer",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "master-artisan",
      name: "Master Artisan",
      groupId: "cirque-troupe",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Unlock special Schematics either found or purchased at events that are available only to those with this skill. Gain 1 free non-Alchemy master artisan schematic that matches a level 3 crafting skill you have.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "any",
                of: [
                  {
                    kind: "trait",
                    traitId: "blacksmith",
                    minLevel: 3
                  },
                  {
                    kind: "trait",
                    traitId: "artificer",
                    minLevel: 3
                  }
                ]
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "trade-caravans",
      name: "Trade Caravans",
      groupId: "cirque-troupe",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Purchase up to 30 resources of your choice at the market price, as listed in the Cirque Market Price Guide at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Purchase up to 60 resources of your choice at the market price, as listed in the Cirque Market Price Guide at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "trade-caravans",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Purchase up to 100 resources of your choice at the market price, as listed in the Cirque Market Price Guide at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "trade-caravans",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "blackmail",
      name: "Blackmail",
      groupId: "cirque-menagerie",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May convert 3 Espionage points to 4 silver dragons OR 4 silver dragons to 2 Espionage points at check in. May convert up to 2 gold dragons or 10 Espionage in this way.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "heist",
      name: "Heist",
      groupId: "cirque-menagerie",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Purchase up to 6 resources per Retainer, as listed in the Cirque Market Price Guide at check in. Final amounts are determined based on a random roll in the range of +/- 10% more resources.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Purchase up to 14 resources per Retainer at check in; modifier range is +/- 20% resources.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "heist",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Purchase up to 20 resources per Retainer at check in; modifier range is +/- 30% resources.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "heist",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "henchman",
      name: "Henchman",
      groupId: "cirque-menagerie",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain the Henchman skill. See additional details below this table.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "shadow-merchant",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "master-thief",
      name: "Master Thief",
      groupId: "cirque-menagerie",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Choose 3 letters from the range of lockpicking letters, A - X. When picking a lock, you now always have access to these letters. Gain the permanent letters Y and Z. May now automatically defeat any Level 1 - 3 Basic Lock once per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "disable-device",
                minLevel: 3
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "rumormonger",
      name: "Rumormonger",
      groupId: "cirque-menagerie",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Generate one negative Rumor about a character at the event. Send your rumor(s) to staff at least one week before each event via contact@eldritchlarp.com or our Contact form.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Generate two negative Rumors about up to 2 characters at the event.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "rumormonger",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Generate three negative Rumors about up to 3 characters at the event.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "rumormonger",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "scandalous-rumors",
      name: "Scandalous Rumors",
      groupId: "cirque-menagerie",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Steal X Influence from each player targeted by your Rumormonger skill at check in. X equals your level of skill in Rumormonger. This skill may only be used every other event on a given player.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "rumormonger",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "shadow-merchant",
      name: "Shadow Merchant",
      groupId: "cirque-menagerie",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain access to the Black Market item sheet. You may purchase any number of items from this list at check in, or as staff is available at events.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "stun-mastery",
      name: "Stun Mastery",
      groupId: "cirque-menagerie",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May now use the Stun active martial skill from any direction when attacking, and gain one extra use of Stun per Refresh. You must have access to Stun already, through a weapons skill that grants it.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "anyTrait",
                matching: {
                  tag: "attack"
                },
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "armor-mastery",
      name: "Armor Mastery",
      groupId: "knight-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain +1 Armor Value (AV) when wearing any armor type.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "armor-proficiency",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +1 AV when wearing any armor type.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "armor-mastery",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +1 AV when wearing any armor type.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "armor-mastery",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "banneret",
      name: "Banneret",
      groupId: "knight-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain +1 Retainer slot. Any retainers you employ must be Soldier Basic Archetype only. They may have the Veteran Advanced Archetype.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +1 retainer slot.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "banneret",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +1 retainer slot.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "banneret",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "lionheart",
      name: "Lionheart",
      groupId: "knight-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May negate the Fear effect once per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "martial-training",
      name: "Martial Training",
      groupId: "knight-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Choose any two of the following martial skills: One-Handed Weapons - 1, Two-Handed Weapons - 1, Tough - 1, Armor Proficiency - 1, Shields - 1",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "battle-hardened",
      name: "Battle Hardened",
      groupId: "knight-martial",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "You may negate the Fear effect once per Refresh and gain +1 Tough. This effect can stack with any other ability, item, or consumable that grants the same benefit(s).",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "tough",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "defensive-mastery",
      name: "Defensive Mastery",
      groupId: "knight-martial",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Choose any active martial skill that you have access to. You are now immune to the effects of that skill, including any damage taken to your Armor Value or body hit locations as a result.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "anyTrait",
                matching: {
                  tag: "attack"
                },
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "juggernaut",
      name: "Juggernaut",
      groupId: "knight-martial",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May use the Juggernaut ability 1 time per event. See additional details below this table.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "May use the Juggernaut ability 2 times per event.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "juggernaut",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "May use the Juggernaut ability 3 times per event.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "juggernaut",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "martial-expertise",
      name: "Martial Expertise",
      groupId: "knight-martial",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain +1 level of Master of Arms. Master of Arms levels above 3 give the same benefit as Master of Arms 3",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +1 level of Master of Arms.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "martial-expertise",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +1 level of Master of Arms.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "martial-expertise",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "second-wind",
      name: "Second Wind",
      groupId: "knight-martial",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May take a knee and rest for 5 minutes to refresh your entire Tough pool 1 time per event.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "tough",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +1 use of Second Wind.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "second-wind",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +1 use of Second Wind.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "second-wind",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "shield-wall",
      name: "Shield Wall",
      groupId: "knight-martial",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Any shield you use may not be sundered. Additionally, you gain +1 Resist call per Refresh. This resist is not tied to the use of a shield",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "shields",
                minLevel: 3
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "weapon-mastery",
      name: "Weapon Mastery",
      groupId: "knight-martial",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May apply all known active martial skills to any weapons you are capable of using.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              },
              {
                kind: "anyTrait",
                matching: {
                  tag: "attack"
                },
                minLevel: 1
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "banner-of-mercy",
      name: "Banner of Mercy",
      groupId: "knight-mercy",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain the Banner of Mercy skill. Requires a banner prop. See additional details below this table.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "battlefield-medicine",
      name: "Battlefield Medicine",
      groupId: "knight-mercy",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain the Battlefield Medicine skill. The uninterrupted roleplay duration is 5 minutes. Requires one use of a Chirurgeon's Kit. See additional details below this table.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Uninterrupted roleplay duration is 3 minutes. Requires one use of a Chirurgeon's Kit.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "battlefield-medicine",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Uninterrupted roleplay duration is 1 minute. Requires one use of a Chirurgeon's Kit.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "battlefield-medicine",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "field-medic",
      name: "Field Medic",
      groupId: "knight-mercy",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Battlefield Medicine skill no longer requires the use of a Chirurgeon's Kit.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "battlefield-medicine",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "trained-medic",
      name: "Trained Medic",
      groupId: "knight-mercy",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Your Medicine Skill may now halt another character's Dying count. Reduce your Medicine Skill healing time by one minute.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "medicine",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "Reduce your Medicine Skill healing time by three minutes.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "trained-medic",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Reduce your Medicine Skill healing time by five minutes.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "trained-medic",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "triage",
      name: "Triage",
      groupId: "knight-mercy",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May use the Triage ability 1 time per event. See additional details below this table.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "May use the Triage ability 2 times per event.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "triage",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "May use the Triage ability 3 times per event.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "triage",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "logistician",
      name: "Logistician",
      groupId: "magister-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Logistician reduces the resource requirement of Interactive Events by 6 resources. This benefit may only be applied to a reduction in iron ingots, refined wood, leather, or cloth. May be used 1 time per event.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Reduce the resource requirement of an Interactive Event by 18 total resources. May be used 1 time per event.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "logistician",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Reduce the resource requirement of an Interactive Event by 30 total resources. May be used 1 time per event.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "logistician",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "ravens",
      name: "Ravens",
      groupId: "magister-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Receive 3 Espionage to spend on Rumors of any level at check in every event. Chance to receive letters from NPCs.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Receive 6 Espionage to spend on Rumors of any level at check in every event. Chance to receive letters from NPCs.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "ravens",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Receive 9 Espionage to spend on Rumors of any level at check in every event. Chance to receive letters from NPCs.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "ravens",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "anamnesis",
      name: "Anamnesis",
      groupId: "magister-scholar",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Allows you to ask one question based on a known lore per Refresh. Requires an Anamnesis Decoction, 5 minutes of uninterrupted meditation, and the requisite lore skill. This is a staff adjudicated skill.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "May ask 2 questions per refresh. Each question requires the use of an Anamnesis decoction.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "anamnesis",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "May ask 3 questions per refresh. Each question requires the use of an Anamnesis decoction.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "anamnesis",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "esoteric-studies",
      name: "Esoteric Studies",
      groupId: "magister-scholar",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Reduce the number of lore props required to get additional levels in lore skills by 1.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "forbidden-lore",
      name: "Forbidden Lore",
      groupId: "magister-scholar",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Forbidden Lore grants you access to special lore props at Eldritch events. Lores gained from this skill cannot be copied.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "academics",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "library",
      name: "Library",
      groupId: "magister-scholar",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Library grants you additional lore props. At check in, you gain a random lore prop, meeting the following requirements: It is not a Syllabus. It is of the same lore type as an opened lore prop you currently own. It is of the same level as an opened lore prop you currently own.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain two random lores at check in up to your maximum level in a lore type you know.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "library",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain three random lores at check in up to your maximum level in a lore type you know.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "library",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "rigorous-study",
      name: "Rigorous Study",
      groupId: "magister-scholar",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Upon buying this skill, gain 3 Level 1 Lore syllabi of your choice at check in. These lore syllabi are only granted once upon purchase of the skill.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "scribe",
      name: "Scribe",
      groupId: "magister-scholar",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May copy one lore prop that you have opened per event. Cannot copy Syllabi.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "May copy two lore props that you have opened per event. Cannot copy Syllabi.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "scribe",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "May copy three lore props that you have opened per event. Cannot copy Syllabi.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "scribe",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "botanist",
      name: "Botanist",
      groupId: "magister-alchemist",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 6 additional herbs each event at check in. You may choose which reagents you gather with this skill. You may only pull herbs of levels that you have access to with your Herbalism skill.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "herbalism",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 16 additional herbs at check in. You may only pull herbs of levels that you have access to with your Herbalism skill.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "botanist",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 26 additional herbs at check in. You may only pull herbs of levels that you have access to with your Herbalism skill.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "botanist",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "chemist",
      name: "Chemist",
      groupId: "magister-alchemist",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Pay 1 less CP when purchasing Alchemy at levels 2 and 3. You may also choose an additional alchemy schematic of the same level at random after purchasing the skill levels.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "alchemy",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: [
            {
              kind: "modifier",
              modifier: {
                id: "chemist-alchemy-discount",
                label: "Chemist",
                target: {
                  kind: "traitCost",
                  traitId: "alchemy",
                  minLevel: 2
                },
                operation: "flatReduction",
                value: 1,
                stacking: "successive",
                rounding: "halfUp"
              }
            }
          ]
        }
      ]
    },
    {
      id: "master-alchemist",
      name: "Master Alchemist",
      groupId: "magister-alchemist",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Alchemy crafting no longer requires the use of an apothecary kit. Additionally, when accompanied by a physical representation of a portable Alchemy station, a person with this skill may do alchemy crafting in the field. For each potion crafted in this way, please roleplay using your Alchemy station. See additional details below.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "alchemy",
                minLevel: 3
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "mithridatism",
      name: "Mithridatism",
      groupId: "magister-alchemist",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain immunity to level 1 poisons. If you are subjected to a level 1 poison you know that you have been poisoned but not what the poison is.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "potent-brews",
      name: "Potent Brews",
      groupId: "magister-alchemist",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Create one additional decoction of the same type when crafting a level 1 decoction.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Create one additional decoction of the same type when crafting a level 2 decoction.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "potent-brews",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Create one additional decoction of the same type when crafting a level 3 decoction.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "potent-brews",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "potion-monger",
      name: "Potion Monger",
      groupId: "magister-alchemist",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event at check in, gain 1 decoction that you can craft for no cost OR acquire one Level 1 Alchemy schematic of your choice.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Once per event at check in, gain 2 decoctions that you can brew for no cost OR acquire one Alchemy schematic of your choice from any level you can craft up to level 2.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "potion-monger",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Once per event at check in, gain 3 decoctions that you can brew for no cost OR acquire one Alchemy schematic of your choice from any level you can craft up to level 3.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "potion-monger",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "chirurgeon",
      name: "Chirurgeon",
      groupId: "magister-chirurgeon",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Fully heal a player from any state; Wounded, Bleeding, and Dying. Heals all limb injuries as well. This is the only ability that heals the Wounded state. This ability requires 20 minutes of uninterrupted roleplay and one use of a Chirurgeon’s Kit. This skill cannot be used in the field on a module; it must be performed in a space designed to be a hospital or surgery center.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Uninterrupted roleplay duration decreased to 15 minutes. This skill requires one use of a Chirurgeon's Kit.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "chirurgeon",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Uninterrupted roleplay duration decreased to 10 minutes. This skill requires one use of a Chirurgeon's Kit.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "chirurgeon",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "master-chirurgeon",
      name: "Master Chirurgeon",
      groupId: "magister-chirurgeon",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Use of the Chirurgeon skill no longer requires the use of a Chirurgeon's Kit.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "chirurgeon",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "mend-limb",
      name: "Mend Limb",
      groupId: "magister-chirurgeon",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Fully restore the use of an injured limb after 6 minutes of uninterrupted roleplay. This skill requires one use of a Chirurgeon's Kit.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Restore the use of an injured limb after 4 minutes. This skill requires one use of a Chirurgeon's Kit.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "mend-limb",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Restore the use of an injured limb after 2 minutes. This skill requires one use of a Chirurgeon's Kit.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "mend-limb",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "resuscitate",
      name: "Resuscitate",
      groupId: "magister-chirurgeon",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Once per event, you may resuscitate a character who has exceeded their Dying Count by five minutes or less, by performing at least 3 minutes of uninterrupted roleplay. This skill requires one use of a Chirurgeon's Kit. After resuscitation, the target player will be in the Wounded state and any injuries they sustained will be present.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "chirurgeon",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "trained-physician",
      name: "Trained Physician",
      groupId: "magister-chirurgeon",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Medicine Skill may now halt another character's Dying count. Reduce your Medicine Skill healing time by one minute.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "medicine",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "Reduce your Medicine Skill healing time by three minutes.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "trained-physician",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Reduce your Medicine Skill healing time by five minutes.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "trained-physician",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "calling-favors",
      name: "Calling Favors",
      groupId: "noble-general",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Convert 1 Influence to 4 silver dragons per event at check in. Up to 32 silver dragons may be converted in this way.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "the-second-estate",
                minLevel: 1
              },
              {
                kind: "trait",
                traitId: "taxation",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "courtiers",
      name: "Courtiers",
      groupId: "noble-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain +1 Retainer slot and ability to bestow 1 Courtier archetype on a player. A courtier made in this way does not need to become your retainer.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +1 Retainer slot and bestow 1 additional Courtier archetype.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "courtiers",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +1 Retainer slot and bestow 1 additional Courtier archetype.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "courtiers",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "feudalism",
      name: "Feudalism",
      groupId: "noble-general",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain 2 Influence per Retainer at check-in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "the-second-estate",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "household",
      name: "Household",
      groupId: "noble-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain +2 Retainer slots.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +2 Retainer slots.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "household",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +2 Retainer slots.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "household",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "pulling-strings",
      name: "Pulling Strings",
      groupId: "noble-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event, gain 4 Influence for the purpose of contributing to an Interactive Event.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Once per event, gain 8 Influence for the purpose of contributing to an Interactive Event.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "pulling-strings",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Once per event, gain 12 Influence for the purpose of contributing to an Interactive Event.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "pulling-strings",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "rousing-speech",
      name: "Rousing Speech",
      groupId: "noble-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event, after an inspirational speech to your Retainers and/or anyone who has sworn an oath of loyalty to you and bears your blazon, you may grant them one temporary point of Tough and they may negate the Fear effect once anytime throughout the rest of the event.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "taxation",
      name: "Taxation",
      groupId: "noble-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 8 silver dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 24 silver dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "taxation",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 4 gold dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "taxation",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "the-second-estate",
      name: "The Second Estate",
      groupId: "noble-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 1 Influence per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 3 Influence per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "the-second-estate",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 5 Influence per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "the-second-estate",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "student-of-the-tower",
      name: "Student of the Tower",
      groupId: "noble-aragon",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Choose one of the following Magister archetype skills: Library, Rigorous Studies, Esoteric Studies, Chemist, Potion Monger, Mithridatism. You gain Level 1 in that skill. All subsequent levels of that skill can be purchased normally.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "master-of-the-mists",
      name: "Master of the Mists",
      groupId: "noble-aragon",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event, reduce a Magister’s promotion costs by 20%. You do not have to be retaining them.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "wasteland-warrior",
      name: "Wasteland Warrior",
      groupId: "noble-aragon",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Choose one of the following skills: Two-Handed Weapons - 1, Tough - 1, Combat Agility - 1. If you use spears, gain 1 use of Stagger active martial skill per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "higher-education",
      name: "Higher Education",
      groupId: "noble-aragon",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain Academics 2. Gain 1 CP to spend on any of the following skills: Household, Courtiers, Influential, Espionage, 2-Handed Weapons, or Alchemy.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "academics",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "little-birds",
      name: "Little Birds",
      groupId: "noble-bannon",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 1 Espionage per Retainer to a maximum of 4 per event at check in. You may forgo gaining any Espionage and instead gain a maximum of 2 Influence.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "friends-in-high-places",
      name: "Friends in High Places",
      groupId: "noble-bannon",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Add +2 Influence to any Influence contributed with Pulling Strings once per event.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "pulling-strings",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "entourage",
      name: "Entourage",
      groupId: "noble-bannon",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain +4 Retainer slots.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "household",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "connections-at-court",
      name: "Connections at Court",
      groupId: "noble-bannon",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event, reduce a Vigil’s promotion cost by 20%. You do not have to be retaining them.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "fervor-of-the-dawnbringer",
      name: "Fervor of the Dawnbringer",
      groupId: "noble-blayne",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Your Rousing Speech also refreshes a use of Master of Arms for all of those who have it.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "rousing-speech",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "theocracy",
      name: "Theocracy",
      groupId: "noble-blayne",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain 4 Influence or 2 Gold Dragons every event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "the-second-estate",
                minLevel: 1
              },
              {
                kind: "trait",
                traitId: "taxation",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "monasticism",
      name: "Monasticism",
      groupId: "noble-blayne",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event, reduce an Auron’s promotion costs by 20%. You do not have to be retaining them.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "humble-beginnings",
      name: "Humble Beginnings",
      groupId: "noble-blayne",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Qualify for the Noble Archetype as a Commonfolk Archetype.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "martial-instruction",
      name: "Martial Instruction",
      groupId: "noble-corveaux",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Choose any two of the following martial skills: One-Handed Weapons - 1, Two-Handed Weapons - 1, Armor Specialist - 1, Armor Proficiency - 1, Shields - 1",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "lord-captain",
      name: "Lord Captain",
      groupId: "noble-corveaux",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Choose one of the following Knight archetype skills: Lionheart, Armor Mastery, Martial Expertise, Trained Medic, Battlefield Medicine. You gain Level 1 in that skill. All subsequent levels of that skill can be purchased normally.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "knight-commander",
      name: "Knight Commander",
      groupId: "noble-corveaux",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event, reduce a Knight’s promotion costs by 20%. You do not have to be retaining them.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "heavy-armor-training",
      name: "Heavy Armor Training",
      groupId: "noble-corveaux",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain +2 Armor Value (AV) when wearing heavy armor.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "armor-proficiency",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "raiding-party",
      name: "Raiding Party",
      groupId: "noble-hale",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "For every Knight or Soldier archetype you retain, gain 5 random resources per event at check in",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "household",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "raised-by-wolves",
      name: "Raised by Wolves",
      groupId: "noble-hale",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Choose any two of the following martial skills: One-Handed Weapons - 1, Two-Handed Weapons - 1, Tough - 1, Armor Proficiency - 1, Shields - 1",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "berserkers",
      name: "Berserkers",
      groupId: "noble-hale",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "When using your Rousing Speech ability, you can alternatively grant 2 Tough or 2 Fear negations instead of its normal 1 Tough and 1 Fear negation.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "rousing-speech",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "axe-master",
      name: "Axe Master",
      groupId: "noble-hale",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain One-Handed Weapons - 1. Instead of gaining a Stun however, you gain a Sunder active martial skill that can only be used with one- or two-handed axes.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "rally",
      name: "Rally",
      groupId: "noble-innis",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May use the Rally skill once per Refresh. This skill mirrors the Auron skill, Embolden, but does not require religious context or the Book of Magnus.",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "trait",
            traitId: "ways-of-old",
            minLevel: 1
          },
          grants: []
        }
      ]
    },
    {
      id: "strength-of-the-oak",
      name: "Strength of the Oak",
      groupId: "noble-innis",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May use the Strength of the Oak skill once per Refresh. This skill mirrors the Auron skill Bulwark of Faith but does not require a religious inclined speech or the Book of Magnus.",
          cost: {
            currencyId: "cp",
            amount: 0
          },
          requires: {
            kind: "trait",
            traitId: "ways-of-old",
            minLevel: 1
          },
          grants: []
        }
      ]
    },
    {
      id: "ways-of-old",
      name: "Ways of Old",
      groupId: "noble-innis",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain Rally and Strength of the Oak as skills.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "rousing-speech",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "masters-of-the-arrow",
      name: "Masters of the Arrow",
      groupId: "noble-innis",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain +1 Retainer slot that can only be used for the Bowyer archetype.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "whispers-of-the-deepwood",
      name: "Whispers of the Deepwood",
      groupId: "noble-innis",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Choose a 1 CP skill from another Noble House tree. You acquire that skill. It replaces this one.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "horn-of-the-wood",
      name: "Horn of the Wood",
      groupId: "noble-innis",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May use your Rousing Speech ability an additional time per event.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "rousing-speech",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "pact-of-old",
      name: "Pact of Old",
      groupId: "noble-richter",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain +1 Retainer slot that can only be used for Blacksmith or Gunsmith archetypes.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "scion-of-the-dark-tower",
      name: "Scion of the Dark Tower",
      groupId: "noble-richter",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain a one-time payout of 10 Influence.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "the-iron-fist",
      name: "The Iron Fist",
      groupId: "noble-richter",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain +4 Influence every event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "the-second-estate",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "legacy-of-the-forge",
      name: "Legacy of the Forge",
      groupId: "noble-richter",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event, you may purchase a schematic (at the market cost) matching the type, and not exceeding the level, of a crafter Retainer in your employ.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "scallywag",
      name: "Scallywag",
      groupId: "noble-rourke",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Choose one of the following Cirque archetype skills: Blackmail, Gossip, Shadow Merchant. You gain Level 1 in that skill. All subsequent levels of that skill can be purchased normally.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "pirate-cove",
      name: "Pirate Cove",
      groupId: "noble-rourke",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "May sell items at check in for Cirque buyback prices. A maximum of 25 silver dragons in goods can be sold this way. Influence can be gained instead of coin at a rate of 5 silver dragons to 1 Influence.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "plunder",
      name: "Plunder",
      groupId: "noble-rourke",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "For every Commonfolk, Urchin, or Brigand Retainer in your employ, gain 3 random resources every event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "household",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "dead-mans-chest",
      name: "Dead Man's Chest",
      groupId: "noble-rourke",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 1 gold dragon every event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "taxation",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "discourse",
      name: "Discourse",
      groupId: "noble-twilight-empire",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "For every two Retainers in your employ, gain a random level 1 lore prop, up to 2, every event at check in. You may instead forgo all lore props to gain one syllabus of your choice.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "household",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "duelist-training",
      name: "Duelist Training",
      groupId: "noble-twilight-empire",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Choose any two of the following martial skills: Archer, Two-Handed Weapons - 1, Tough - 1, Armor Proficiency - 1, Shields - 1",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "shadowing-moon-and-radiant-sun",
      name: "Shadowing Moon and Radiant Sun",
      groupId: "noble-twilight-empire",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain both of the following abilities:1) Once per event, by holding a scholarly conclave, you gain insight into an opened lore that you or one of your Retainers owns. You may ask one question of staff about that lore. It cannot be Forbidden Lore.2) Hyper Awareness - 1 per the Vigil archetype skills.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "academics",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "strategically-minded",
      name: "Strategically Minded",
      groupId: "noble-twilight-empire",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Choose one of the following Vigil archetype skills: Courtly Intrigue, Sense Influence OR the Magister archetype skill, Logistician. You gain level 1 in that skill. All subsequent levels in that skill may be purchased normally.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "hardy-constitution",
      name: "Hardy Constitution",
      groupId: "veteran-academic",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Once you have had, and been cured or survived, a Level 1 Poison or Disease, you cannot be afflicted by it again.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "home-remedy",
      name: "Home Remedy",
      groupId: "veteran-academic",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 1 level 1 Disease or Poison cure of your choice per event.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 2 level 1 Disease or Poison cure of your choice per event.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "home-remedy",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 3 level 1 Disease or Poison cure of your choice per event.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "home-remedy",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "lorekeeper",
      name: "Lorekeeper",
      groupId: "veteran-academic",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 1 random level 1 lore prop (not a Syllabus) in a category of your choice per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 2 random level 1 lore props (not Syllabi) in a category of your choice per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "lorekeeper",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 3 random level 1 lore props (not Syllabi) in a category of your choice per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "lorekeeper",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "rub-dirt-on-it",
      name: "Rub Dirt On It",
      groupId: "veteran-academic",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Reduce your Medicine skill healing time by two minutes.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "medicine",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "sawbones",
      name: "Sawbones",
      groupId: "veteran-academic",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May mend injured limbs. You must roleplay uninterrupted mending a limb for 5 minutes. This takes a use of a Chirurgeon's Kit.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        }
      ]
    },
    {
      id: "scrivener",
      name: "Scrivener",
      groupId: "veteran-academic",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "You may copy 1 lore prop that you have opened per event. Cannot copy Syllabi.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        },
        {
          level: 2,
          description: "You may copy 2 lore props that you have opened per event. Cannot copy Syllabi.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "scrivener",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "You may copy 3 lore props that you have opened per event. Cannot copy Syllabi.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "scrivener",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "well-read",
      name: "Well Read",
      groupId: "veteran-academic",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Reduce the number of lore props it takes to acquire additional levels in lore skills. This does not apply to the first level of a Lore skill. Each time you level up a lore skill, it costs you 1 less than the listed amount of required lores.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "academics",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 1
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "apprentice",
      name: "Apprentice",
      groupId: "veteran-artisan",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain 1 random Schematic every event at check in of a craft you own. The maximum level of any acquired Schematic is your level in that craft.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "anyTrait",
                matching: {
                  tag: "crafting"
                },
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "architect",
      name: "Architect",
      groupId: "veteran-artisan",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event, turn in 1 character Archetype card that only has a Basic or Veteran Archetype for 10 iron ingots, refined wood, leather, or cloth toward a Construction Project. The archetype card should not be retained by anyone.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        },
        {
          level: 2,
          description: "Once per event, turn in up to 2 character Archetype cards that only have a Basic or Veteran Archetype for 10 iron ingots, refined wood, leather, or cloth toward a Construction project. The archetype cards should not be retained by anyone.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "architect",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Once per event, turn in up to 3 character Archetype cards that only have a Basic or Veteran Archetype for 10 iron ingots, refined wood, leather, or cloth toward a Construction project. The archetype cards should not be retained by anyone.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "architect",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "brewmaster",
      name: "Brewmaster",
      groupId: "veteran-artisan",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 1 decoction that you can craft at check in every event for no cost.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "alchemy",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 1
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 2 decoctions that you can craft at check in every event for no cost.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "brewmaster",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 3 decoctions that you can craft at check in every event for no cost.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "brewmaster",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "entrepreneur",
      name: "Entrepreneur",
      groupId: "veteran-artisan",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 4 silver dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 12 silver dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "entrepreneur",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 20 silver dragons per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "entrepreneur",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "market-exchange",
      name: "Market Exchange",
      groupId: "veteran-artisan",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event at check in, you may convert resources into coin, or coin into resources (1 resource = 1 silver dragon). Up to 2 Gold Dragons worth of value may be traded in this way.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        }
      ]
    },
    {
      id: "trade-deals",
      name: "Trade Deals",
      groupId: "veteran-artisan",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Once per event at check in, turn in up to 3 character Archetype cards that only have a Basic or Veteran Archetype for three resources (of your choice) or three silver dragons per card. The archetype cards should not be retained by anyone.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "call-to-arms",
      name: "Call to Arms",
      groupId: "veteran-burgher",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per Refresh, grant any number of Basic or Veteran Archetypes who hear you give a rousing speech one temporary use of Tough.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        }
      ]
    },
    {
      id: "mob-rule",
      name: "Mob Rule",
      groupId: "veteran-burgher",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Once per event at check in, turn in up to 3 character Archetype cards that only have a Basic or Veteran Archetype to remove one Influence per card from a player of your choice. A player can only be targeted once every other event by this power. The archetype cards used for this should not be retained by anyone.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "power-of-the-people",
      name: "Power of the People",
      groupId: "veteran-burgher",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Once per event at check in, turn in up to 3 character Archetype cards that only have a Basic or Veteran Archetype for one Influence or four silver dragons per card. The archetype cards should not be retained by anyone.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "prominent-citizen",
      name: "Prominent Citizen",
      groupId: "veteran-burgher",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 1 Influence every event at check in",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 3 Influence every event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "prominent-citizen",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 5 Influence every event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "prominent-citizen",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "village-gossip",
      name: "Village Gossip",
      groupId: "veteran-burgher",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event at check in, gain 3 Espionage points that can only be used to acquire rumors.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        },
        {
          level: 2,
          description: "Once per event at check in, gain 6 Espionage points that can only be used to acquire rumors.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "village-gossip",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Once per event at check in, gain 9 Espionage points that can only be used to acquire rumors.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "village-gossip",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "voice-of-the-people",
      name: "Voice of the People",
      groupId: "veteran-burgher",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event at check in, turn in up to 3 character Archetype cards that only have a Basic or Veteran Archetype for one Influence per card for the purpose of placing in the Decisive Moment box(es) of your choice.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        }
      ]
    },
    {
      id: "advanced-herbalism",
      name: "Advanced Herbalism",
      groupId: "veteran-peasant",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain an additional 12 herbs when you use Herbalism at check in. You may now choose which herbs you get for all your Herbalism at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "herbalism",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "life-of-labor",
      name: "Life of Labor",
      groupId: "veteran-peasant",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain +1 Tough.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +1 Tough.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "life-of-labor",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +1 Tough.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "life-of-labor",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "master-farmer",
      name: "Master Farmer",
      groupId: "veteran-peasant",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain an additional 6 cloth per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "farming",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 1
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain an additional 16 cloth per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "master-farmer",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain an additional 26 cloth per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "master-farmer",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "master-feller",
      name: "Master Feller",
      groupId: "veteran-peasant",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain an additional 6 refined wood per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "woodcutting",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 1
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain an additional 16 refined wood per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "master-feller",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain an additional 26 refined wood per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "master-feller",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "master-hunter",
      name: "Master Hunter",
      groupId: "veteran-peasant",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain an additional 6 leather per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "hunting",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 1
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain an additional 16 leather per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "master-hunter",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain an additional 26 leather per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "master-hunter",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "master-miner",
      name: "Master Miner",
      groupId: "veteran-peasant",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain an additional 6 iron ingots per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "mining",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 1
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain an additional 16 iron ingots per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "master-miner",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain an additional 26 iron ingots per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "master-miner",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "resourceful",
      name: "Resourceful",
      groupId: "veteran-peasant",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Once per event at check in, gain an additional 12 resources. You may now choose which resources you get for all your gathering.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "gathering",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "mark",
      name: "Mark",
      groupId: "veteran-scoundrel",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "1 time per Refresh, ask a player or NPC how much Influence OR coin they have. They must answer truthfully.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        },
        {
          level: 2,
          description: "3 times per refresh, ask a player or NPC how much Influence OR coin they have. They must answer truthfully.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "mark",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "5 times per refresh, ask a player or NPC how much Influence OR coin they have. They must answer truthfully.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "mark",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "sabotage",
      name: "Sabotage",
      groupId: "veteran-scoundrel",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Once per event at check in, gain 6 Espionage for the purpose of putting into the Decisive Moment box(es) of your choice.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "scrounger",
      name: "Scrounger",
      groupId: "veteran-scoundrel",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event at check in, you can swap any resources you gain or have for any other resources of the same level. Iron, Leather, Cloth, and Wood cannot be traded for Herbs but Herbs can be traded for other Herbs of the same level.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        }
      ]
    },
    {
      id: "second-story-job",
      name: "Second Story Job",
      groupId: "veteran-scoundrel",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 1 permanent letter between A-H. Automatically defeat a Level 1 lock once per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "disable-device",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 1
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 1 permanent letter between I-P. Automatically defeat up to a level 2 lock once per refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "second-story-job",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 1 permanent letter between Q-X. Automatically defeat up to a level 3 lock once per refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "second-story-job",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "spy-network",
      name: "Spy Network",
      groupId: "veteran-scoundrel",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Once per event at check in, turn in up to 3 character Archetype cards that only have a Basic or Veteran Archetype for 2 Espionage per card. The archetype cards used for this should not be retained by anyone.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "espionage",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "word-on-the-street",
      name: "Word on the Street",
      groupId: "veteran-scoundrel",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event, you can ask who is currently winning a Decisive Moment.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        }
      ]
    },
    {
      id: "grizzled",
      name: "Grizzled",
      groupId: "veteran-soldier",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain 1 use of Master of Arms and Second Wind per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "master-of-arms",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "gutsy",
      name: "Gutsy",
      groupId: "veteran-soldier",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Negate 1 Fear call per refresh.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        }
      ]
    },
    {
      id: "light-armor-focus",
      name: "Light Armor Focus",
      groupId: "veteran-soldier",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 1 Armor Value (AV) when wearing light armor.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "armor-proficiency",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 1
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "mercenary-captain",
      name: "Mercenary Captain",
      groupId: "veteran-soldier",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "You can no longer be Retained, but you gain +1 retainer slot. Any retainers you employ can be Soldier, Brigand, or Urchin Basic Archetype only. They may have the Veteran Advanced Archetype.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +1 retainer slot for Soldier, Brigand, or Urchin Archetypes.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "mercenary-captain",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +1 retainer slot for Soldier, Brigand, or Urchin Archetypes.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "mercenary-captain",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "militiaman",
      name: "Militiaman",
      groupId: "veteran-soldier",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain the Martial Training skill. At character creation, you may take the Soldier archetype starting equipment and coin instead of your basic archetype’s. You will still maintain your original basic archetype’s skills and card.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "anyTrait",
                matching: {
                  groupId: "martial"
                },
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 1
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "phalanx",
      name: "Phalanx",
      groupId: "veteran-soldier",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain Two-Handed Weapons - 1. When you use a spear, you gain 1 Stagger active martial skill per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        }
      ]
    },
    {
      id: "plucky",
      name: "Plucky",
      groupId: "veteran-soldier",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain 1 Resist active martial skill per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "quartermaster",
      name: "Quartermaster",
      groupId: "veteran-soldier",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per event at check in, gain 5 silver dragons worth of items from the Cirque price sheet.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 1
          },
          grants: []
        },
        {
          level: 2,
          description: "Once per event at check in, gain 14 silver dragons worth of items from the Cirque price sheet.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "quartermaster",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Once per event at check in, gain 24 silver dragons worth of items from the Cirque price sheet.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "quartermaster",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "favored-of-the-court",
      name: "Favored of the Court",
      groupId: "vigil-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 1 Influence per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 3 Influence per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "favored-of-the-court",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 5 Influence per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "favored-of-the-court",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "hardened-constitution",
      name: "Hardened Constitution",
      groupId: "vigil-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "You are now immune to any level 1 poison. If you are subjected to a level 1 poison, you know that you have been poisoned, but not what the poison is, unless you have the Diagnose ability.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "whispers-in-the-halls",
      name: "Whispers in the Halls",
      groupId: "vigil-general",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 2 Espionage per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 4 Espionage per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "whispers-in-the-halls",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 6 Espionage per event at check in.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "whispers-in-the-halls",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "courtly-intrigue",
      name: "Courtly Intrigue",
      groupId: "vigil-justicar",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain 2 Espionage per event at check in. Gain special insight into 1 rumor you have gained via the Espionage system.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain 4 Espionage per event at check in. Gain special insight into 2 rumors you have gained via the Espionage system.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "courtly-intrigue",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain 6 Espionage per event at check in. Gain special insight into 3 rumors you have gained via the Espionage system.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "courtly-intrigue",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "extortion",
      name: "Extortion",
      groupId: "vigil-justicar",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "May convert 3 Espionage points to 1 Influence OR 1 influence to 2 Espionage every event at check in. Up to 3 Influence or 6 Espionage may be generated in this way.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        }
      ]
    },
    {
      id: "eye-for-detail",
      name: "Eye for Detail",
      groupId: "vigil-justicar",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain Perception - 1 and Perception - 2. Once per event, you may ask staff for insight on something you have seen or heard.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 2
          },
          grants: []
        }
      ]
    },
    {
      id: "kingmaker",
      name: "Kingmaker",
      groupId: "vigil-justicar",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Remove or grant X Influence from each character you started a rumor about using the Whisper Campaign skill at check in. X equals your level in the Whisper Campaign skill. A player can only be targeted once every other event by this power. Granted Influence is supplied by staff and removed Influence is given to staff.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "whisper-campaign",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "sense-influence",
      name: "Sense Influence",
      groupId: "vigil-justicar",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "1 time per Refresh, ask a player or NPC how much Influence and Espionage they have. They must answer truthfully.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "3 times per refresh, ask a player or NPC how much Influence and Espionage they have. They must answer truthfully.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "sense-influence",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "5 times per refresh, ask a player or NPC how much Influence and Espionage they have. They must answer truthfully.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "sense-influence",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "whisper-campaign",
      name: "Whisper Campaign",
      groupId: "vigil-justicar",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Add 1 positive or negative rumor based about another character to the pool of rumors. Send your rumor(s) to staff at least one week before each event via contact@eldritchlarp.com or our Contact form.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Add 2 positive or negative rumors about up to two different characters to the pool of rumors.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "whisper-campaign",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Add 3 positive or negative rumors about up to three different characters to the pool of rumors.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "whisper-campaign",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "guardian",
      name: "Guardian",
      groupId: "vigil-sentinel",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Once per Refresh, while within arm’s reach of another character, you may transfer one active martial call or melee strike targeted at that character to you.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "tough",
                minLevel: 1
              },
              {
                kind: "trait",
                traitId: "hyper-awareness",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 0
              }
            ]
          },
          grants: []
        },
        {
          level: 2,
          description: "May now use the Guardian skill twice per refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "guardian",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "May now use the Guardian skill three times per refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "guardian",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "hyper-awareness",
      name: "Hyper Awareness",
      groupId: "vigil-sentinel",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain +1 use of the Resist active martial skill per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +1 use of Resist per refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "hyper-awareness",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +1 use of Resist per refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "hyper-awareness",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "iron-body",
      name: "Iron Body",
      groupId: "vigil-sentinel",
      tags: [
        "signature"
      ],
      tiers: [
        {
          level: 1,
          description: "Gain +2 points of Tough.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "tough",
                minLevel: 3
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "martial-prowess",
      name: "Martial Prowess",
      groupId: "vigil-sentinel",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain +1 level of Master of Arms. This stacks with your existing level(s) of Master of Arms. Master of Arms levels above 3 give the same benefit as Master of Arms 3",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain +1 level of Master of Arms. This stacks with your existing level(s) of Master of Arms.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "martial-prowess",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain +1 level of Master of Arms. This stacks with your existing level(s) of Master of Arms.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "martial-prowess",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    },
    {
      id: "wylding-hand",
      name: "Wylding Hand",
      groupId: "vigil-sentinel",
      tags: [],
      tiers: [
        {
          level: 1,
          description: "Gain the ability to use brawling boffers (Claws). Gain access to the Stun active martial skill. May use one Stun per Refresh.",
          cost: {
            currencyId: "cp",
            amount: 1
          },
          requires: {
            kind: "track",
            trackId: "rank",
            minStep: 0
          },
          grants: []
        },
        {
          level: 2,
          description: "Gain access to the Disarm active martial skill with your brawling boffers. May use one Disarm per refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "wylding-hand",
                minLevel: 1
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 2
              }
            ]
          },
          grants: []
        },
        {
          level: 3,
          description: "Gain access to the Cleave active martial skill with your brawling boffers. May use one Cleave per refresh.",
          cost: {
            currencyId: "cp",
            amount: 2
          },
          requires: {
            kind: "all",
            of: [
              {
                kind: "trait",
                traitId: "wylding-hand",
                minLevel: 2
              },
              {
                kind: "track",
                trackId: "rank",
                minStep: 3
              }
            ]
          },
          grants: []
        }
      ]
    }
  ],
  tracks: [
    {
      id: "rank",
      name: "Rank",
      currencyId: "influence",
      requires: {
        kind: "packageTier",
        tier: "advanced"
      },
      steps: [
        {
          index: 0,
          label: "Rank 0",
          cost: null,
          unlocks: [
            {
              kind: "note",
              text: "One free level 1 advanced archetype skill in the primary or general tree, and access to all Rank 0 archetype skills."
            }
          ]
        },
        {
          index: 1,
          label: "Rank 1",
          cost: {
            currencyId: "influence",
            amount: 12
          },
          unlocks: [
            {
              kind: "note",
              text: "Access to all Rank 1 archetype skills."
            }
          ]
        },
        {
          index: 2,
          label: "Rank 2",
          cost: {
            currencyId: "influence",
            amount: 16
          },
          unlocks: [
            {
              kind: "note",
              text: "Access to all Rank 2 archetype and signature skills."
            }
          ]
        },
        {
          index: 3,
          label: "Rank 3",
          cost: {
            currencyId: "influence",
            amount: 20
          },
          unlocks: [
            {
              kind: "note",
              text: "Access to all Rank 3 archetype skills."
            }
          ]
        }
      ]
    }
  ],
  purchaseRules: [
    {
      id: "pre5-archetype-cap",
      label: "Before Event 5: archetype skills",
      message: "Before Event 5 you may purchase up to level 2 of a skill granted by your archetype.",
      phase: "creation",
      appliesTo: {},
      maxLevel: 2,
      when: {
        kind: "quality",
        qualityId: "created-before-event-5"
      }
    },
    {
      id: "pre5-other-cap",
      label: "Before Event 5: other skills",
      message: "Before Event 5 you may purchase up to level 1 of a skill not granted by your archetype.",
      phase: "creation",
      appliesTo: {},
      maxLevel: 1,
      onlyIfNotGranted: true,
      when: {
        kind: "quality",
        qualityId: "created-before-event-5"
      }
    },
    {
      id: "pre5-crafting-cap",
      label: "Before Event 5: crafting",
      message: "Before Event 5 you may not purchase more than level 1 of any crafting skill at creation, even if it came with your archetype.",
      phase: "creation",
      appliesTo: {
        tag: "crafting"
      },
      maxLevel: 1,
      when: {
        kind: "quality",
        qualityId: "created-before-event-5"
      }
    },
    {
      id: "e5to6-cap",
      label: "Event 5 to 6: all skills",
      message: "At Event 5 or 6 you may purchase up to level 2 of any skill at creation.",
      phase: "creation",
      appliesTo: {},
      maxLevel: 2,
      when: {
        kind: "quality",
        qualityId: "created-event-5-to-6"
      }
    },
    {
      id: "e5to6-crafting-cap",
      label: "Event 5 to 6: crafting",
      message: "At Event 5 or 6 you may not purchase more than level 2 of any crafting skill at creation.",
      phase: "creation",
      appliesTo: {
        tag: "crafting"
      },
      maxLevel: 2,
      when: {
        kind: "quality",
        qualityId: "created-event-5-to-6"
      }
    }
  ],
  sheet: [
    {
      id: "identity",
      title: "Identity",
      fields: [
        {
          id: "name",
          label: "Character Name",
          type: "shortText",
          required: true
        },
        {
          id: "house",
          label: "House / Affiliation",
          type: "shortText",
          required: false
        },
        {
          id: "background",
          label: "Background",
          type: "longText",
          required: false,
          helpText: "Where they come from, and what they left behind."
        }
      ]
    }
  ]
};
