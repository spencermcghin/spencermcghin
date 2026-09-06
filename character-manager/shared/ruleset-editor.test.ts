import test from 'node:test';
import assert from 'node:assert/strict';

import { eldritch } from './rulesets/eldritch';
import { demoRuleset } from './rulesets/demo';
import { validateRuleset } from './ruleset-validation';
import * as edit from './ruleset-editor';
import type { Condition, Ruleset } from './rules-schema';

/**
 * Acceptance test for the designer.
 *
 * The question is not "does the schema describe Eldritch" -- the fixture
 * answers that -- but "could someone sitting in front of the builder produce
 * Eldritch". So this rebuilds the whole ruleset from an empty one using
 * nothing but the operations the UI calls, and asserts the result is
 * indistinguishable from the fixture.
 *
 * It is driven by the fixture rather than hand-written. Eldritch is 201
 * skills over 401 levels; transcribing that by hand would be a second copy to
 * keep in step and would prove less than this does. What this proves is
 * sufficiency: if a construct in a real published ruleset needed an operation
 * the editor does not have, there would be no way to write this function.
 *
 * Containers are created empty and filled a member at a time -- skill then
 * levels, track then steps, package then grants -- because that is the order
 * a person works in, and the order that exposes a missing operation.
 */
function rebuildThroughEditor(target: Ruleset): Ruleset {
  let r = edit.emptyRuleset(target.id, target.name);

  r = edit.setMeta(r, {
    version: target.version,
    description: target.description ?? '',
  });
  r = edit.setStartingBudget(r, target.startingBudget);

  for (const currency of target.currencies) r = edit.addCurrency(r, currency);
  for (const tier of target.packageTiers) r = edit.addPackageTier(r, tier);
  for (const a of target.packageAttributes) r = edit.addPackageAttribute(r, a);
  for (const a of target.traitAttributes) r = edit.addTraitAttribute(r, a);
  for (const quality of target.qualities) r = edit.addQuality(r, quality);

  for (const pkg of target.packages) {
    r = edit.addPackage(r, { ...pkg, grants: [] });
    for (const grant of pkg.grants) r = edit.addPackageGrant(r, pkg.id, grant);
  }

  for (const group of target.traitGroups) r = edit.addGroup(r, group);

  for (const trait of target.traits) {
    const { attributes, ...rest } = trait;
    r = edit.addTrait(r, { ...rest, tiers: [] });
    for (const tier of trait.tiers) {
      const { attributes: tierAttributes, ...tierRest } = tier;
      r = edit.addTier(r, trait.id, tierRest);
      for (const [key, value] of Object.entries(tierAttributes ?? {})) {
        r = edit.setTierAttribute(r, trait.id, tier.level, key, value);
      }
    }
    // Skill-wide metadata is set through the editor too, not passed inline.
    for (const [key, value] of Object.entries(attributes ?? {})) {
      r = edit.setTraitAttribute(r, trait.id, key, value);
    }
  }

  for (const track of target.tracks) {
    r = edit.addTrack(r, { ...track, steps: [] });
    for (const step of track.steps) r = edit.addTrackStep(r, track.id, step);
  }

  for (const rule of target.purchaseRules) r = edit.addPurchaseRule(r, rule);

  for (const section of target.sheet) {
    r = edit.addSheetSection(r, { ...section, fields: [] });
    for (const field of section.fields) r = edit.addSheetField(r, section.id, field);
  }

  return r;
}

const buildEldritchThroughTheEditor = () => rebuildThroughEditor(eldritch);

test('Eldritch can be rebuilt using only the designer operations', () => {
  assert.deepEqual(buildEldritchThroughTheEditor(), eldritch);
});

test('the rebuilt ruleset is coherent', () => {
  assert.deepEqual(validateRuleset(buildEldritchThroughTheEditor()), []);
});

test('the operations are not shaped around one ruleset', () => {
  // The demo set uses features Eldritch does not -- notably a cost modifier
  // targeting a tag -- so rebuilding it too keeps the operation set honest.
  assert.deepEqual(rebuildThroughEditor(demoRuleset), demoRuleset);
});

test('every condition in Eldritch survives the clause editor', () => {
  // The clause editor reads a condition as a flat list and writes one back.
  // Round-tripping every real condition is what proves it never quietly
  // changes what a rule means -- including the nested one, which it must
  // carry through untouched rather than flatten.
  const conditions: Condition[] = [];
  for (const trait of eldritch.traits) {
    if (trait.requires) conditions.push(trait.requires);
    for (const tier of trait.tiers) conditions.push(tier.requires);
  }
  for (const group of eldritch.traitGroups) {
    if (group.requires) conditions.push(group.requires);
  }
  for (const pkg of eldritch.packages) conditions.push(pkg.requires);

  assert.ok(conditions.length > 400, 'expected the whole ruleset to be covered');
  for (const condition of conditions) {
    const roundTripped = edit.conditionFrom(
      edit.operatorOf(condition),
      edit.clausesOf(condition)
    );
    assert.deepEqual(roundTripped, condition);
  }
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
  const r = edit.addPrerequisite(eldritch, 'academics', 1, 'one-handed-weapons', 1);
  const tier = r.traits.find((t) => t.id === 'academics')!.tiers[0];
  assert.deepEqual(tier.requires, {
    kind: 'trait',
    traitId: 'one-handed-weapons',
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
  // Shown against the demo set: the Eldritch transcription declares no
  // metadata fields, because the guide's skill tables do not carry any.
  const firstAid = demoRuleset.traits.find((t) => t.id === 'first-aid')!;
  assert.match(firstAid.summary ?? '', /Healer’s Kit/);
  assert.match(firstAid.attributes?.safety ?? '', /No contact/);
  assert.equal(firstAid.tiers[0].attributes?.calls, 'Stabilise');
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
  assert.equal(at('academics'), null); // ungated: belongs in no rank column
});

test('a compound gate still yields its rank', () => {
  // Martial Expertise 3 requires "Martial Expertise - 2 and Rank 3": the rank
  // sits beside a ladder clause and must still be found. Taken from the
  // ruleset rather than invented, because this shape is the commonest one in
  // the whole guide.
  const t = eldritch.traits.find((x) => x.id === 'martial-expertise')!;
  assert.equal(edit.trackPositionOf(t, 'rank'), 3);

  // ...and the ladder half is still readable as a normal prerequisite edge.
  assert.deepEqual(edit.prerequisiteEdges(t.tiers[2].requires), [
    { traitId: 'martial-expertise', minLevel: 2 },
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
  const tier = eldritch.traits.find((t) => t.id === 'academics')!.tiers[0];
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
  const tier = after.traits.find((t) => t.id === 'disable-device')!.tiers[0];
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

/* ------------------------------------------------------------------ *
 * The outline's shape
 * ------------------------------------------------------------------ */

test('trees nest the way the ruleset declares', () => {
  const buckets = edit.bucketsFor(eldritch, 'group');

  // Top level is the general trees plus one per advanced archetype -- not the
  // 40 groups flat, which is what made the outline a wall.
  assert.ok(buckets.length < 12, `expected a short top level, got ${buckets.length}`);

  const knight = buckets.find((b) => b.key === 'knight')!;
  assert.ok(knight, 'expected a Knight bucket at the top level');
  assert.deepEqual(
    knight.children.map((c) => c.key),
    ['knight-general', 'knight-martial', 'knight-mercy']
  );
  // The archetype itself files no skills; they are all in its subtrees.
  assert.equal(knight.traits.length, 0);
  assert.equal(
    knight.total,
    knight.children.reduce((n, c) => n + c.traits.length, 0)
  );
});

test('every skill appears exactly once in the outline', () => {
  const seen: string[] = [];
  const walk = (bs: edit.TraitBucket[]) => {
    for (const b of bs) {
      seen.push(...b.traits.map((t) => t.id));
      walk(b.children);
    }
  };
  walk(edit.bucketsFor(eldritch, 'group'));
  assert.equal(seen.length, eldritch.traits.length);
  assert.equal(new Set(seen).size, eldritch.traits.length);
});

test('a skill whose tree was deleted is still shown, not lost', () => {
  // Silently dropping it would leave an author with a validation error they
  // cannot navigate to.
  const orphaned = edit.removeGroup(eldritch, 'general');
  const buckets = edit.bucketsFor(orphaned, 'group');
  const orphans = buckets.find((b) => b.key === '__orphans');
  assert.ok(orphans, 'expected an "not in any tree" bucket');
  assert.ok(orphans.traits.some((t) => t.id === 'academics'));
});

test('a tree whose parent was deleted is promoted, not hidden', () => {
  const cut = edit.removeGroup(eldritch, 'knight');
  const buckets = edit.bucketsFor(cut, 'group');
  assert.ok(buckets.some((b) => b.key === 'knight-martial'));
});

test('grouping by rank or tag stays flat', () => {
  for (const dimension of ['track:rank', 'tag']) {
    const buckets = edit.bucketsFor(eldritch, dimension);
    assert.ok(buckets.length > 0);
    assert.ok(
      buckets.every((b) => b.children.length === 0),
      `${dimension} should not nest`
    );
  }
});

test('filtering keeps the path to a match', () => {
  const buckets = edit.bucketsFor(eldritch, 'group');
  const found = edit.filterBuckets(buckets, (t) => t.id === 'shield-wall');

  // Shield Wall is two levels down, under Knight then Knight · Martial.
  assert.deepEqual(found.map((b) => b.key), ['knight']);
  assert.deepEqual(found[0].children.map((b) => b.key), ['knight-martial']);
  assert.deepEqual(found[0].children[0].traits.map((t) => t.id), ['shield-wall']);
  assert.equal(found[0].total, 1);
});

test('filtering to nothing yields nothing, rather than empty trees', () => {
  const buckets = edit.bucketsFor(eldritch, 'group');
  assert.deepEqual(edit.filterBuckets(buckets, () => false), []);
});

test('bucketKeys reaches every level', () => {
  const buckets = edit.bucketsFor(eldritch, 'group');
  const keys = edit.bucketKeys(buckets);
  assert.ok(keys.includes('knight'));
  assert.ok(keys.includes('knight-martial'));
  assert.equal(new Set(keys).size, keys.length, 'keys must be unique');
});
