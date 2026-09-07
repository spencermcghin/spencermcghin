import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { NarrativeMap } from './narrative-schema';
import { connectionsOf, indexMap } from './narrative';
import {
  groupEntities,
  groupedConnections,
  orderEntities,
  rowFacts,
  slotOf,
} from './narrative-view';

const map = JSON.parse(
  readFileSync(join(__dirname, '..', 'tools', 'eldritch-narrative.json'), 'utf8')
) as NarrativeMap;
const idx = indexMap(map);
const all = map.entities;
const named = (list: { name: string }[]) => list.map((e) => e.name);

/* ------------------------------------------------------------------ *
 * Ordering
 * ------------------------------------------------------------------ */

test('sequence order reads numbers as numbers', () => {
  const events = orderEntities(
    all.filter((e) => e.kindId === 'event'),
    'sequence',
    idx
  );
  assert.deepEqual(named(events), [
    'Event 8 — The Precipice',
    'Event 9 — The Undercroft',
    'Event 10 — The End',
  ]);
});

test('entries with no date sort after every entry that has one', () => {
  const ordered = orderEntities(all, 'sequence', idx);
  const lastDated = ordered.map((e) => Boolean(e.occursAt)).lastIndexOf(true);
  const firstUndated = ordered.map((e) => Boolean(e.occursAt)).indexOf(false);
  assert.ok(lastDated < firstUndated, 'undated entries must not colonise the top');
});

test('most-connected order puts the load-bearing entries first', () => {
  const ordered = orderEntities(all, 'connections', idx);
  assert.equal(ordered[0].name, 'Event 10 — The End');
  assert.equal(ordered[1].name, 'The Rite of Aeons');
});

test('unfinished-first order puts drafts before canon', () => {
  const ordered = orderEntities(all, 'status', idx);
  const lastDraft = ordered.map((e) => e.status).lastIndexOf('draft');
  const firstCanon = ordered.map((e) => e.status).indexOf('canon');
  assert.ok(lastDraft < firstCanon);
});

test('ordering does not mutate the input', () => {
  const input = all.slice(0, 5);
  const before = named(input);
  orderEntities(input, 'connections', idx);
  assert.deepEqual(named(input), before);
});

/* ------------------------------------------------------------------ *
 * Grouping
 * ------------------------------------------------------------------ */

test('grouping by the sequence uses connections, not the date field', () => {
  const groups = groupEntities(all, 'sequence', idx);
  const ten = groups.find((g) => g.label === 'Event 10 — The End')!;

  // Written with no `occursAt` of its own; filed under Event 10 because it is
  // connected to it. This is the case that makes the field-free rule earn its
  // keep -- most projects fill in a date for almost nothing.
  const undated = ten.entities.filter((e) => !e.occursAt);
  assert.ok(undated.length > 0);
});

test('every grouping ends with the leftovers, and shows them', () => {
  for (const by of ['sequence', 'lane', 'tag'] as const) {
    const groups = groupEntities(all, by, idx);
    const last = groups[groups.length - 1];
    assert.equal(last.leftover, true, `${by} must end with a leftover group`);
    assert.ok(last.entities.length > 0);
  }
});

test('nothing is lost when grouping by the sequence', () => {
  const groups = groupEntities(all, 'sequence', idx);
  const seen = new Set(groups.flatMap((g) => g.entities.map((e) => e.id)));
  const spine = new Set(
    all.filter((e) => e.kindId === map.campaign!.spineKindId).map((e) => e.id)
  );
  for (const e of all) {
    if (spine.has(e.id)) continue; // the headings themselves
    assert.ok(seen.has(e.id), `${e.name} fell out of the grouping`);
  }
});

test('an entry with several tags appears under each of them', () => {
  const groups = groupEntities(all, 'tag', idx);
  const multi = all.find((e) => e.tags.length > 1)!;
  const appearances = groups.filter((g) => g.entities.some((e) => e.id === multi.id));
  assert.equal(appearances.length, multi.tags.length);
});

test('the track grouping catches content in no track', () => {
  const groups = groupEntities(all, 'lane', idx);
  const noTrack = groups.find((g) => g.label === 'No track')!;
  assert.ok(noTrack.entities.length > 0);
});

/* ------------------------------------------------------------------ *
 * Rows
 * ------------------------------------------------------------------ */

test('a row shows where something sits even when nobody filled in the date', () => {
  const rite = rowFacts(map.entities.find((e) => e.id === 'rite-of-aeons')!, idx);
  assert.equal(rite.entity.occursAt, undefined);
  assert.equal(rite.whereInferred, true);
  assert.ok(rite.where?.startsWith('Event'));
});

test('a row prefers the stated date over the inferred one', () => {
  const one = map.entities.find((e) => e.occursAt?.includes('·'))!;
  const facts = rowFacts(one, idx);
  assert.equal(facts.where, one.occursAt);
  assert.equal(facts.whereInferred, false);
});

test('a row reports the absences worth seeing', () => {
  const gated = map.entities.find((e) => e.requires)!;
  assert.equal(rowFacts(gated, idx).gated, true);
  assert.ok(map.entities.every((e) => rowFacts(e, idx).sourced));
});

test('a slot is the part after the separator, and absent when there is none', () => {
  assert.equal(slotOf({ occursAt: 'Event 10 · Saturday' } as never), 'Saturday');
  assert.equal(slotOf({ occursAt: 'Event 10' } as never), undefined);
  assert.equal(slotOf({} as never), undefined);
});

/* ------------------------------------------------------------------ *
 * Connections
 * ------------------------------------------------------------------ */

test('connections are gathered under their wording, biggest first', () => {
  const groups = groupedConnections('event-10', idx, connectionsOf as never);
  const total = groups.reduce((n, g) => n + g.others.length + g.broken, 0);
  assert.equal(total, (idx.byEntity.get('event-10') ?? []).length);
  for (let i = 1; i < groups.length; i += 1) {
    assert.ok(groups[i - 1].others.length >= groups[i].others.length);
  }
  // Thirty-odd edges become a handful of readable headings.
  assert.ok(groups.length <= 6);
});
