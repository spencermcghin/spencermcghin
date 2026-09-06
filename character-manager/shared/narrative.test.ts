import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { eldritch } from './rulesets/eldritch';
import { emptyNarrativeMap, type NarrativeMap } from './narrative-schema';
import { connectionsOf, hubs, indexMap, orphans, validateMap } from './narrative';

/**
 * Tested against the real extracted map rather than a toy, for the same
 * reason the engine is tested against the real ruleset: the interesting
 * failures are the ones real content produces.
 */
const eldritchMap = JSON.parse(
  readFileSync(join(__dirname, '..', 'tools', 'eldritch-narrative.json'), 'utf8')
) as NarrativeMap;

test('the extracted Eldritch map is coherent against its own ruleset', () => {
  assert.deepEqual(validateMap(eldritchMap, eldritch), []);
});

test('a relation reads correctly from both ends', () => {
  const idx = indexMap(eldritchMap);

  // Stored once, as "Event 8 leads to Event 9".
  const fromEight = connectionsOf('event-8', idx).find((c) => c.otherId === 'event-9')!;
  assert.equal(fromEight.label, 'leads to');
  assert.equal(fromEight.outgoing, true);

  const fromNine = connectionsOf('event-9', idx).find((c) => c.otherId === 'event-8')!;
  assert.equal(fromNine.label, 'follows from');
  assert.equal(fromNine.outgoing, false);
  assert.equal(fromNine.relation.id, fromEight.relation.id);
});

test('a symmetric relation reads the same either way', () => {
  const idx = indexMap(eldritchMap);
  const a = connectionsOf('rite-of-aeons', idx).find((c) => c.otherId === 'oblivion')!;
  const b = connectionsOf('oblivion', idx).find((c) => c.otherId === 'rite-of-aeons')!;
  assert.equal(a.label, 'opposes');
  assert.equal(b.label, 'opposes');
});

test('the hubs are what the campaign turns on', () => {
  const ranked = hubs(indexMap(eldritchMap));
  assert.equal(ranked[0].entity.id, 'event-10');
  assert.ok(ranked.slice(0, 3).some((h) => h.entity.id === 'rite-of-aeons'));
});

test('orphans are found', () => {
  // The Vale is defined in the guide's glossary and nothing in the extracted
  // map connects to it -- exactly the kind of dangling definition this is for.
  assert.deepEqual(
    orphans(indexMap(eldritchMap)).map((e) => e.id),
    ['vale']
  );
});

test('a connection to a deleted entity is reported, not hidden', () => {
  const broken: NarrativeMap = {
    ...eldritchMap,
    entities: eldritchMap.entities.filter((e) => e.id !== 'obeah'),
  };
  const issues = validateMap(broken, eldritch);
  assert.ok(issues.some((i) => i.code === 'broken-relation'));

  // ...and the entity at the far end still lists it, marked missing.
  const link = connectionsOf('crimson-vale', indexMap(broken)).find(
    (c) => c.otherId === 'obeah'
  )!;
  assert.equal(link.other, undefined);
});

test('content gated on a skill the ruleset does not have is reported', () => {
  // The cross-check that neither document can do alone: a lore prop behind a
  // renamed skill is content nobody can ever open.
  const map: NarrativeMap = {
    ...eldritchMap,
    entities: eldritchMap.entities.map((e) =>
      e.id === 'echoes-of-the-rite'
        ? { ...e, requires: { kind: 'trait' as const, traitId: 'renamed-away', minLevel: 2 } }
        : e
    ),
  };
  const issue = validateMap(map, eldritch).find((i) => i.code === 'unknown-rule-reference');
  assert.ok(issue, 'expected the dangling rule reference to be reported');
  assert.match(issue.message, /renamed-away/);
});

test('a gate that does resolve is left alone', () => {
  // The Echoes are behind Metaphysics 2, which is a real Eldritch lore skill.
  const echoes = eldritchMap.entities.find((e) => e.id === 'echoes-of-the-rite')!;
  assert.deepEqual(echoes.requires, {
    kind: 'trait',
    traitId: 'metaphysics',
    minLevel: 2,
  });
  assert.ok(eldritch.traits.some((t) => t.id === 'metaphysics'));
});

test('an entity of an undeclared kind is reported', () => {
  const map: NarrativeMap = {
    ...eldritchMap,
    entities: [
      ...eldritchMap.entities,
      {
        id: 'x',
        kindId: 'not-declared',
        name: 'X',
        aliases: [],
        tags: [],
        status: 'draft',
        sources: [],
      },
    ],
  };
  assert.ok(validateMap(map).some((i) => i.code === 'unknown-kind'));
});

test('an empty map is valid, not broken', () => {
  assert.deepEqual(validateMap(emptyNarrativeMap('anything')), []);
  assert.deepEqual(orphans(indexMap(emptyNarrativeMap('anything'))), []);
});
