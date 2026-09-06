/**
 * Builds shared/rulesets/eldritch.ts from tools/eldritch-source.json.
 *
 * The Eldritch ruleset is the acceptance criterion for this app: 201 skills
 * across 40 trees, with every awkward rule a published LARP actually has. It
 * is far too large to hand-write and far too easy to get subtly wrong by
 * hand, so it is generated, and the mined source tables are committed beside
 * this script so the transform can be reviewed and re-run.
 *
 * The Player's Guide is the source. The community planner spreadsheet was
 * tried first and turned out to lag it -- it is missing the Justicar tree's
 * Whisper Campaign and Sense Influence entirely, and it invents a "Chemist
 * Refund" skill costing -1 CP to work around a spreadsheet's inability to
 * express a discount. The planner is still used for two things the guide
 * gives only in prose: the Crafting/Gathering/Attack/Defend classification,
 * and the lore levelling table.
 *
 *   node tools/build-eldritch.mjs
 *
 * Anything the transform cannot resolve fails the build rather than being
 * dropped: a prerequisite that silently means nothing is worse than one that
 * stops the build.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = JSON.parse(readFileSync(join(here, 'eldritch-source.json'), 'utf8'));

/* ------------------------------------------------------------------ *
 * Names and ids
 * ------------------------------------------------------------------ */

/** "(Signature)" marks a skill's role, not its name; ids drop it. */
const SIGNATURE = /\s*\(Signature\)\s*$/;

const slug = (s) =>
  s
    .toLowerCase()
    .replace(SIGNATURE, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Splits "Bowyer - 2" into its skill name and level. Bare names are level 1.
 * The "(Signature)" marker is dropped here so that a skill's name, its id and
 * any prerequisite naming it all agree; whether it is a signature skill is
 * carried separately, as a tag.
 */
function splitLevel(raw) {
  const t = raw.trim().replace(SIGNATURE, '').trim();
  const m = /^(.*?)\s*-\s*(\d+)\s*$/.exec(t);
  return m ? { name: m[1].trim(), level: Number(m[2]) } : { name: t, level: 1 };
}

/* ------------------------------------------------------------------ *
 * Rows
 * ------------------------------------------------------------------ */

const rows = [];

const subtypeOf = (name) => (src.subtype[name] || '').toLowerCase();

for (const [table, group] of [
  [src.general, 'general'],
  [src.martial, 'martial'],
]) {
  for (const [rawName, description, prereq, cost] of table) {
    const { name, level } = splitLevel(rawName);
    rows.push({
      name,
      level,
      group,
      subtype: subtypeOf(name),
      description,
      prereq,
      cost,
      signature: SIGNATURE.test(rawName),
    });
  }
}

for (const r of src.lore) {
  const { name, level } = splitLevel(r[0]);
  rows.push({
    name,
    level,
    group: 'lore',
    subtype: '',
    description: r[3],
    prereq: r[4],
    cost: r[5], // "Lore Syllabus" / "6 Props" / "9 Props" -- never CP.
    signature: false,
  });
}

for (const [rawName, description, prereq, cost, archetype, tree] of src.adv) {
  const { name, level } = splitLevel(rawName);
  rows.push({
    name,
    level,
    group: `${slug(archetype)}-${slug(tree)}`,
    archetype: slug(archetype),
    archetypeName: archetype,
    tree,
    subtype: subtypeOf(name),
    description,
    prereq,
    cost,
    signature: SIGNATURE.test(rawName),
  });
}

/**
 * name -> trait id. Keyed on a flattened form, because the guide writes the
 * same skill both ways: "One-Handed Weapons" defines it and "One Handed
 * Weapons - 1" requires it.
 */
const flatten = (s) => s.replace(SIGNATURE, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const idByName = new Map();
for (const row of rows) idByName.set(flatten(row.name), slug(row.name));
const lookup = (name) => idByName.get(flatten(name));

/* ------------------------------------------------------------------ *
 * Prerequisites
 *
 * Of the 384 prerequisite cells in the guide, 273 clauses are rank gates and
 * 249 name a skill. The remainder are the interesting ones, and each is
 * handled explicitly below rather than by a general parser -- a parser that
 * guesses at English would fail silently, and a prerequisite that silently
 * means nothing is worse than one that fails to build.
 * ------------------------------------------------------------------ */

const QUALITY_CLAUSES = {
  'lockpicking kit': 'lockpicking-kit',
  'dusklander background': 'dusklander',
};

/** "any skill of a kind" -- the clause shape the schema gained for these. */
const SELECTOR_CLAUSES = {
  'a weapons skill': { matching: { tag: 'attack' }, minLevel: 1 },
  'any martial skill': { matching: { groupId: 'martial' }, minLevel: 1 },
  'a crafting skill': { matching: { tag: 'crafting' }, minLevel: 1 },
};

const unresolved = [];

function clause(text, forSkill) {
  const t = text.trim().replace(/\s+/g, ' ');
  const lower = t.toLowerCase();

  if (!t || lower === 'none' || lower === '-') return null;

  const rank = /^rank (\d+)$/i.exec(t);
  if (rank) return { kind: 'track', trackId: 'rank', minStep: Number(rank[1]) };

  if (QUALITY_CLAUSES[lower]) {
    return { kind: 'quality', qualityId: QUALITY_CLAUSES[lower] };
  }
  if (SELECTOR_CLAUSES[lower]) {
    return { kind: 'anyTrait', ...SELECTOR_CLAUSES[lower] };
  }

  // "Artificer skill at level 3" -- the guide's long form for a skill gate.
  const longForm = /^(.*?) skill at level (\d+)$/i.exec(t);
  if (longForm && lookup(longForm[1])) {
    return { kind: 'trait', traitId: lookup(longForm[1]), minLevel: Number(longForm[2]) };
  }

  const { name, level } = splitLevel(t);
  if (lookup(name)) {
    return { kind: 'trait', traitId: lookup(name), minLevel: level };
  }

  unresolved.push({ skill: forSkill, clause: t });
  return null;
}

/**
 * One prerequisite cell in the guide reads "Blacksmith or Artificer skill at
 * level 3 and Rank 2". English cannot say where the brackets go; the guide's
 * Master Artisan is a crafting capstone, so it is read as (either craft at 3)
 * and Rank 2 rather than Blacksmith-at-any-level. Handled here by name so the
 * reading is visible rather than buried in a parser.
 */
const HAND_READ = {
  'Master Artisan': {
    kind: 'all',
    of: [
      {
        kind: 'any',
        of: [
          { kind: 'trait', traitId: 'blacksmith', minLevel: 3 },
          { kind: 'trait', traitId: 'artificer', minLevel: 3 },
        ],
      },
      { kind: 'track', trackId: 'rank', minStep: 2 },
    ],
  },
};

function prerequisite(row) {
  const hand = HAND_READ[row.name];
  if (hand) return hand;

  // "At least ONE of the following: A, B, C" -- the guide's way of writing a
  // disjunction, and the only place it uses a list like this.
  const oneOf = /^at least one of the following:\s*(.+)$/i.exec(row.prereq.trim());
  if (oneOf) {
    const of = oneOf[1]
      .split(/,\s*/)
      .map((p) => clause(p, row.name))
      .filter(Boolean);
    if (of.length > 1) return { kind: 'any', of };
  }

  // Clauses are joined by "and", by commas, or by both.
  const parts = row.prereq
    .split(/\s+and\s+|,/i)
    .map((p) => clause(p, row.name))
    .filter(Boolean);

  if (parts.length === 0) return { kind: 'always' };
  if (parts.length === 1) return parts[0];
  return { kind: 'all', of: parts };
}

/* ------------------------------------------------------------------ *
 * Costs
 * ------------------------------------------------------------------ */

/**
 * Lore is not bought with CP. The guide: "There is no CP cost for the lore
 * skill when you find a Syllabus"; levels two and three are redeemed for six
 * and nine lore props. Nothing in the engine can count props a player is
 * holding, so the cost is zero and the real requirement is carried as a
 * manual check for staff to settle at the table.
 */
function loreCost(row) {
  if (row.level === 1) {
    return {
      cost: { currencyId: 'cp', amount: 0 },
      check: `Hand in a ${row.name} Syllabus. There is no CP cost for a lore skill found this way.`,
    };
  }
  const props = row.level === 2 ? 6 : 9;
  return {
    cost: { currencyId: 'cp', amount: 0 },
    check:
      `Redeem ${props} unique ${row.name} - ${row.level - 1} lore props with staff. ` +
      'Duplicates cannot be used, and redeemed props are signed.',
  };
}

/**
 * A blank cost means the skill is not bought at all. Innis's Rally and
 * Strength of the Oak are handed over by Ways of Old ("Gain Rally and
 * Strength of the Oak as skills"), so they cost nothing and are gated on the
 * skill that grants them -- which the guide already states as their
 * prerequisite.
 */
function costFor(row) {
  if (row.group === 'lore') return loreCost(row);
  const raw = String(row.cost).trim();
  if (raw === '' || raw === '-') return { cost: { currencyId: 'cp', amount: 0 }, check: null };
  const n = Number(raw.replace(/[^\d-]/g, ''));
  if (!Number.isFinite(n)) {
    unresolved.push({ skill: row.name, clause: `cost ${row.cost}` });
    return { cost: { currencyId: 'cp', amount: 0 }, check: null };
  }
  return { cost: { currencyId: 'cp', amount: n }, check: null };
}

/* ------------------------------------------------------------------ *
 * Cost modifiers
 *
 * Two skills in the guide change what a later purchase costs. The community
 * planner models Chemist as a second skill costing -1 CP, because a
 * spreadsheet has no way to express a discount; the guide has no such skill,
 * so it is written here as what it actually is.
 *
 * Both are scoped to levels 2 and 3, which is why the modifier target carries
 * a minimum level: without it, the discount would also cheapen level 1.
 * ------------------------------------------------------------------ */

const COST_MODIFIERS = {
  // "Pay 1 less CP when purchasing Alchemy at levels 2 and 3."
  Chemist: [
    {
      id: 'chemist-alchemy-discount',
      label: 'Chemist',
      target: { kind: 'traitCost', traitId: 'alchemy', minLevel: 2 },
      operation: 'flatReduction',
      value: 1,
      stacking: 'successive',
      rounding: 'halfUp',
    },
  ],
  // "When purchasing Blacksmithing or Artificer crafting skill at levels 2 or
  // 3, it costs one less CP." Two modifiers rather than one, because the
  // target names a skill and the rule names two.
  Artisan: [
    {
      id: 'artisan-blacksmith-discount',
      label: 'Artisan (Blacksmith)',
      target: { kind: 'traitCost', traitId: 'blacksmith', minLevel: 2 },
      operation: 'flatReduction',
      value: 1,
      stacking: 'successive',
      rounding: 'halfUp',
    },
    {
      id: 'artisan-artificer-discount',
      label: 'Artisan (Artificer)',
      target: { kind: 'traitCost', traitId: 'artificer', minLevel: 2 },
      operation: 'flatReduction',
      value: 1,
      stacking: 'successive',
      rounding: 'halfUp',
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Traits
 * ------------------------------------------------------------------ */

const TAGGABLE = new Set(['crafting', 'gathering', 'attack', 'defend']);

const byName = new Map();
for (const row of rows) {
  if (!byName.has(row.name)) byName.set(row.name, []);
  byName.get(row.name).push(row);
}

const traits = [];
for (const [name, levels] of byName) {
  levels.sort((a, b) => a.level - b.level);
  const first = levels[0];

  const tags = [];
  const sub = (first.subtype || '').toLowerCase();
  if (TAGGABLE.has(sub)) tags.push(sub);
  if (levels.some((l) => l.signature)) tags.push('signature');

  const tiers = levels.map((row) => {
    const { cost, check } = costFor(row);
    let requires = prerequisite(row);
    if (check) {
      requires =
        requires.kind === 'always'
          ? { kind: 'manual', text: check }
          : { kind: 'all', of: [requires, { kind: 'manual', text: check }] };
    }
    const attributes = {};
    if (row.calls && row.calls !== '-') attributes.calls = row.calls;
    if (row.notes && row.notes !== '-') attributes.notes = row.notes;

    const grants = (COST_MODIFIERS[row.name] ?? []).map((modifier) => ({
      kind: 'modifier',
      modifier,
    }));

    return {
      level: row.level,
      description: row.description || '',
      cost,
      requires,
      grants,
      ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
    };
  });

  traits.push({
    id: slug(name),
    name: name.replace(SIGNATURE, '').trim(),
    groupId: first.group,
    tags,
    tiers,
  });
}

/* ------------------------------------------------------------------ *
 * Groups
 * ------------------------------------------------------------------ */

const groups = [
  {
    id: 'general',
    name: 'General Skills',
    description: 'Available to every character, whatever their archetype.',
  },
  {
    id: 'martial',
    name: 'Martial Skills',
    description:
      'Combat training. Attack skills strike; defend skills absorb. Several ' +
      'advanced skills require any one of these rather than a named skill.',
  },
  {
    id: 'lore',
    name: 'Lore Skills',
    description:
      'Bought with lore props found in play rather than with character ' +
      'points. Reading a lore prop also requires Academics at its level.',
  },
];

const archetypeNames = new Map();
for (const row of rows) {
  if (row.archetype) archetypeNames.set(row.archetype, row.archetypeName);
}
const seenGroups = new Set();
for (const row of rows) {
  if (!row.archetype || seenGroups.has(row.group)) continue;
  seenGroups.add(row.group);
  if (!groups.some((g) => g.id === row.archetype)) {
    groups.push({
      id: row.archetype,
      name: `${archetypeNames.get(row.archetype)} Skills`,
      description: `Open only to characters who hold the ${archetypeNames.get(row.archetype)} archetype.`,
      requires: { kind: 'package', packageId: row.archetype },
    });
  }
  groups.push({
    id: row.group,
    name: `${archetypeNames.get(row.archetype)} · ${row.tree}`,
    parentId: row.archetype,
  });
}

/* ------------------------------------------------------------------ *
 * Archetypes
 * ------------------------------------------------------------------ */

/**
 * Starting skills are written for a human: "Choose 2: 1-Hand Weapon 1,
 * 2-Hand Weapon 1, ...". The shapes that recur are turned into grants; the
 * rest are carried verbatim as a note, which is what the schema's `note`
 * grant is for. Guessing at prose here would put skills on characters that
 * the guide never gave them.
 */
function startingGrants(text) {
  const grants = [];
  const t = text.trim();
  if (!t || t === 'None') return grants;

  const chooseN = /^(?:(.*?)\s+AND\s+)?Choose (\d+):\s*(.+)$/i.exec(t);
  if (chooseN) {
    if (chooseN[1]) grants.push(...startingGrants(chooseN[1]));
    const from = chooseN[3]
      .split(/,\s*/)
      .map((s) => splitLevel(s.replace(/\s+(\d)$/, ' - $1')))
      .map(({ name, level }) =>
        lookup(name) ? { kind: 'trait', traitId: lookup(name), level } : null
      );
    if (from.every(Boolean)) {
      grants.push({ kind: 'choice', pick: Number(chooseN[2]), from });
      return grants;
    }
    return [{ kind: 'note', text: t }];
  }

  // "A - 1 and B - 1", "A - 1, and B - 1 or C - 1", "Either A or B, and ..."
  const segments = t
    .replace(/^Either\s+/i, '')
    .split(/,\s*and\s+|\s+and\s+(?:either\s+)?/i)
    .map((s) => s.trim())
    .filter(Boolean);

  let ok = true;
  for (const seg of segments) {
    const options = seg
      .replace(/^either\s+/i, '')
      .split(/\s+or\s+/i)
      .map((s) => splitLevel(s.replace(/\.$/, '').replace(/\s+(\d)$/, ' - $1')))
      .map(({ name, level }) =>
        lookup(name) ? { kind: 'trait', traitId: lookup(name), level } : null
      );
    if (options.some((o) => o === null)) {
      ok = false;
      break;
    }
    grants.push(options.length === 1 ? options[0] : { kind: 'choice', pick: 1, from: options });
  }

  return ok ? grants : [{ kind: 'note', text: t }];
}

const packages = [];

for (const a of src.basicArchetypes) {
  const [name, cost, equipment, coin, retainer, salary, skills, notes] = a;
  const grants = startingGrants(skills);
  const silver = /(\d+)\s*silver dragons/i.exec(coin);
  if (silver) {
    grants.unshift({ kind: 'currency', currencyId: 'coin', amount: Number(silver[1]) });
  }
  packages.push({
    id: slug(name),
    name,
    tier: 'basic',
    cost: { currencyId: 'cp', amount: Number(cost) },
    requires: { kind: 'always' },
    grants,
    attributes: {
      startingEquipment: equipment,
      startingCoin: coin,
      retainerBenefit: retainer,
      salary,
    },
    ...(notes && notes !== 'None' ? { notes } : {}),
  });
}

const BASIC_IDS = new Set(packages.map((p) => p.id));

/** "Gentry, Physician, Soldier, or Courtier" / "Any except Courtier or Gentry". */
function archetypePrereq(text) {
  const t = text.trim();
  if (/^any$/i.test(t)) return { kind: 'always' };

  const except = /^any except(?: for)?\s+(.+)$/i.exec(t);
  const list = (except ? except[1] : t)
    .split(/,\s*|\s+or\s+/i)
    .map((s) => slug(s.trim()))
    .filter((s) => BASIC_IDS.has(s));

  if (list.length === 0) return { kind: 'always' };
  const any = { kind: 'anyPackage', packageIds: list };
  return except ? { kind: 'not', of: any } : any;
}

for (const a of src.advancedArchetypes) {
  const [name, cost, retainer, salary, prereq, starting, notes] = a;
  packages.push({
    id: slug(name),
    name,
    tier: 'advanced',
    cost: { currencyId: 'cp', amount: Number(cost) },
    requires: archetypePrereq(prereq),
    // The free starting skill is a pick from a tree the player chooses, which
    // depends on a choice the schema records elsewhere; carried as a note.
    grants: [{ kind: 'note', text: starting }],
    attributes: { retainerBenefit: retainer, salary },
    ...(notes && notes !== 'None' ? { notes } : {}),
  });
}

/* Gentry's rank discount, from the guide: "Gentry get a 25% reduction on all
   rank increases", with true rounding and successive stacking per the Notes
   for All Skills section. */
packages
  .find((p) => p.id === 'gentry')
  .grants.push({
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
  });

/* ------------------------------------------------------------------ *
 * Assembly
 * ------------------------------------------------------------------ */

const ruleset = {
  id: 'eldritch',
  name: 'Eldritch',
  version: '2026',
  description:
    'A live action roleplaying game set in the Kingdom of Arnesse. Events ' +
    'take place in the Annwyn. Transcribed from the Player’s Guide 2026 as ' +
    'the acceptance test for this builder: if a rule here cannot be ' +
    'expressed, the schema is missing something.',

  // Event 1 characters start with 4 CP; the guide's progression chart runs to
  // 20 CP by Event X.
  startingBudget: [{ currencyId: 'cp', amount: 4 }],

  currencies: [
    { id: 'cp', name: 'Character Point', abbreviation: 'CP', kind: 'progression' },
    { id: 'influence', name: 'Influence', abbreviation: 'Inf', kind: 'progression' },
    { id: 'coin', name: 'Silver Dragon', abbreviation: 'sd', kind: 'economy' },
  ],

  packageTiers: [
    { id: 'basic', name: 'Basic Archetype', maxHeld: 1 },
    { id: 'advanced', name: 'Advanced Archetype', maxHeld: 1 },
  ],

  packageAttributes: [
    { key: 'startingEquipment', label: 'Starting Equipment' },
    { key: 'startingCoin', label: 'Starting Coin' },
    { key: 'retainerBenefit', label: 'Retainer Benefit' },
    { key: 'salary', label: 'Salary' },
  ],

  // No metadata fields are declared. Calls -- the verbals a skill grants --
  // are the first thing a player looks up at an event, and the community
  // planner keeps a column for them, but the guide's skill tables do not
  // carry them and every cell in that column is empty. Declaring a field
  // nothing fills would promise the reader something this transcription does
  // not have. ./demo.ts shows the feature instead.
  traitAttributes: [],

  qualities: [
    {
      id: 'lockpicking-kit',
      name: 'Lockpicking Kit',
      category: 'Equipment',
      description:
        'Required to take Disable Device. A player knows whether their ' +
        'character is carrying one.',
      grantedBy: 'player',
    },
    {
      id: 'dusklander',
      name: 'Dusklander Background',
      category: 'Background',
      description:
        'Required to take Gunsmith: the guide notes that your background ' +
        'should indicate where the knowledge came from. Agreed with staff at ' +
        'character approval.',
      grantedBy: 'staff',
    },
    {
      id: 'created-before-event-5',
      name: 'Created before Event 5',
      category: 'Character creation',
      description:
        'Which event a character was made for decides the creation caps that ' +
        'applied to it. Recorded by staff at approval and never changes.',
      grantedBy: 'staff',
    },
    {
      id: 'created-event-5-to-6',
      name: 'Created at Event 5 or 6',
      category: 'Character creation',
      description: 'See "Created before Event 5". Looser caps than the earliest events.',
      grantedBy: 'staff',
    },
  ],

  packages,
  traitGroups: groups,
  traits,

  tracks: [
    {
      id: 'rank',
      name: 'Rank',
      currencyId: 'influence',
      requires: { kind: 'packageTier', tier: 'advanced' },
      steps: [
        {
          index: 0,
          label: 'Rank 0',
          // "Archetype CP cost" in the guide's table: entry is paid for by
          // buying the advanced archetype, so there is nothing more to spend.
          cost: null,
          unlocks: [
            {
              kind: 'note',
              text: 'One free level 1 advanced archetype skill in the primary or general tree, and access to all Rank 0 archetype skills.',
            },
          ],
        },
        {
          index: 1,
          label: 'Rank 1',
          cost: { currencyId: 'influence', amount: 12 },
          unlocks: [{ kind: 'note', text: 'Access to all Rank 1 archetype skills.' }],
        },
        {
          index: 2,
          label: 'Rank 2',
          cost: { currencyId: 'influence', amount: 16 },
          unlocks: [
            { kind: 'note', text: 'Access to all Rank 2 archetype and signature skills.' },
          ],
        },
        {
          index: 3,
          label: 'Rank 3',
          cost: { currencyId: 'influence', amount: 20 },
          unlocks: [{ kind: 'note', text: 'Access to all Rank 3 archetype skills.' }],
        },
      ],
    },
  ],

  // The guide gives three creation regimes by event. `when` is what keeps
  // them apart; without it only one could be written down.
  purchaseRules: [
    {
      id: 'pre5-archetype-cap',
      label: 'Before Event 5: archetype skills',
      message:
        'Before Event 5 you may purchase up to level 2 of a skill granted by your archetype.',
      phase: 'creation',
      appliesTo: {},
      maxLevel: 2,
      when: { kind: 'quality', qualityId: 'created-before-event-5' },
    },
    {
      id: 'pre5-other-cap',
      label: 'Before Event 5: other skills',
      message:
        'Before Event 5 you may purchase up to level 1 of a skill not granted by your archetype.',
      phase: 'creation',
      appliesTo: {},
      maxLevel: 1,
      onlyIfNotGranted: true,
      when: { kind: 'quality', qualityId: 'created-before-event-5' },
    },
    {
      id: 'pre5-crafting-cap',
      label: 'Before Event 5: crafting',
      message:
        'Before Event 5 you may not purchase more than level 1 of any crafting skill at creation, even if it came with your archetype.',
      phase: 'creation',
      appliesTo: { tag: 'crafting' },
      maxLevel: 1,
      when: { kind: 'quality', qualityId: 'created-before-event-5' },
    },
    {
      id: 'e5to6-cap',
      label: 'Event 5 to 6: all skills',
      message: 'At Event 5 or 6 you may purchase up to level 2 of any skill at creation.',
      phase: 'creation',
      appliesTo: {},
      maxLevel: 2,
      when: { kind: 'quality', qualityId: 'created-event-5-to-6' },
    },
    {
      id: 'e5to6-crafting-cap',
      label: 'Event 5 to 6: crafting',
      message:
        'At Event 5 or 6 you may not purchase more than level 2 of any crafting skill at creation.',
      phase: 'creation',
      appliesTo: { tag: 'crafting' },
      maxLevel: 2,
      when: { kind: 'quality', qualityId: 'created-event-5-to-6' },
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

/* ------------------------------------------------------------------ *
 * Output
 * ------------------------------------------------------------------ */

if (unresolved.length > 0) {
  console.error('Unresolved source values:');
  for (const u of unresolved) console.error(`  ${u.skill}: ${u.clause}`);
  process.exit(1);
}

const header = `/**
 * Eldritch, transcribed from the Player's Guide 2026.
 *
 * GENERATED FILE -- do not edit by hand. Run \`node tools/build-eldritch.mjs\`
 * after changing tools/eldritch-source.json, which holds the mined tables.
 *
 * This is the app's acceptance criterion rather than a demo: a real published
 * ruleset, at full size, with the awkward rules left in. ${traits.length} skills across
 * ${groups.length} trees, ${traits.reduce((n, t) => n + t.tiers.length, 0)} levels in total. New accounts are seeded with
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
 *   - event-dependent caps     (three creation regimes, kept apart by \`when\`)
 */

import type { Ruleset } from '../rules-schema';

export const eldritch: Ruleset = `;

// Double-quoted strings are valid TypeScript, so only the keys are unquoted.
// Rewriting the quotes themselves would corrupt every description containing
// an apostrophe, and the guide is full of them.
const body = JSON.stringify(ruleset, null, 2).replace(
  /^(\s*)"([A-Za-z_][A-Za-z0-9_]*)":/gm,
  '$1$2:'
);

writeFileSync(
  join(here, '..', 'shared', 'rulesets', 'eldritch.ts'),
  `${header}${body};\n`
);

console.log(
  `eldritch.ts: ${traits.length} skills, ` +
    `${traits.reduce((n, t) => n + t.tiers.length, 0)} levels, ` +
    `${groups.length} trees, ${packages.length} archetypes`
);
