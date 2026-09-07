import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { NarrativeMap } from './narrative-schema';
import { indexMap } from './narrative';
import { groupEntities, slotOf } from './narrative-view';
import { findCases, wordingOf } from './narrative-cases';

/**
 * These back statements shown to a reader -- "this entry is linked to two
 * events", "22 entries have no date" -- so a wrong result here is a false
 * claim on screen rather than a broken layout. One such claim shipped before
 * these existed.
 */
const map = JSON.parse(
  readFileSync(join(__dirname, '..', 'tools', 'eldritch-narrative.json'), 'utf8')
) as NarrativeMap;
const idx = indexMap(map);
const cases = findCases(idx);

test('an entry linked to two events is found, and really is linked to both', () => {
  assert.ok(cases.multiSpine.length > 0);
  for (const { entity, on } of cases.multiSpine) {
    assert.ok(on.length > 1);
    const ids = new Set(on.map((e) => e.id));
    assert.equal(ids.size, on.length, 'the same event must not be counted twice');
    for (const target of on) {
      assert.ok(
        (idx.byEntity.get(entity.id) ?? []).some(
          (r) => r.fromId === target.id || r.toId === target.id
        )
      );
    }
  }
});

test('the duplicate case explains the row count a reader can see', () => {
  const groups = groupEntities(map.entities, 'sequence', idx);
  const rows = groups.reduce((n, g) => n + g.entities.length, 0);
  const distinct = new Set(groups.flatMap((g) => g.entities.map((e) => e.id))).size;
  // The excess is exactly the extra filings the multi-event entries produce.
  const excess = cases.multiSpine.reduce((n, c) => n + (c.on.length - 1), 0);
  assert.equal(rows - distinct, excess);
});

test('an entry in two tracks is found', () => {
  assert.ok(cases.multiLane.length > 0);
  assert.ok(cases.multiLane.every((c) => c.on.length > 1));
});

test('inferred and unplaced together account for every undated entry', () => {
  const spineKindId = map.campaign!.spineKindId;
  const undated = map.entities.filter((e) => !e.occursAt && e.kindId !== spineKindId);
  assert.equal(cases.inferred.length + cases.unplaced.length, undated.length);
  // The split is the claim: inferred entries can be placed, unplaced cannot.
  assert.ok(cases.inferred.every((e) => !e.occursAt));
  assert.ok(cases.unplaced.every((e) => !e.occursAt));
});

test('inferred entries are ordered so the most connected is quotable first', () => {
  const degree = (id: string) => (idx.byEntity.get(id) ?? []).length;
  for (let i = 1; i < cases.inferred.length; i += 1) {
    assert.ok(degree(cases.inferred[i - 1].id) >= degree(cases.inferred[i].id));
  }
});

test('aliased entries all actually carry aliases, richest first', () => {
  assert.ok(cases.aliased.length > 0);
  assert.ok(cases.aliased.every((e) => e.aliases.length > 0));
  for (let i = 1; i < cases.aliased.length; i += 1) {
    assert.ok(cases.aliased[i - 1].aliases.length >= cases.aliased[i].aliases.length);
  }
});

test('the directed example really reads differently from each end', () => {
  const d = cases.directed!;
  assert.ok(d);
  assert.notEqual(d.forward, d.back);
  assert.notEqual(d.from.id, d.to.id);
});

test('the symmetric example reads the same from both ends', () => {
  const sym = cases.symmetric;
  if (!sym) return; // a project need not declare any symmetric kind
  assert.deepEqual(
    wordingOf(sym.a.id, idx).includes(sym.label),
    wordingOf(sym.b.id, idx).includes(sym.label)
  );
});

test('the slot list is every slot in use, and only those', () => {
  const used = new Set(map.entities.map(slotOf).filter(Boolean));
  assert.deepEqual(new Set(cases.slots), used);
});

test('the naive spine order is wrong in the way the page claims', () => {
  // The page shows both orders side by side to make the point. If they ever
  // agree the comparison is pointless, and the page hides it.
  assert.notDeepEqual(cases.spineNaive, cases.spineNatural);
  assert.deepEqual(cases.spineNatural, [
    'Event 8 — The Precipice',
    'Event 9 — The Undercroft',
    'Event 10 — The End',
  ]);
  assert.equal(cases.spineNaive[0], 'Event 10 — The End');
});

test('every gated entry carries a requirement', () => {
  assert.ok(cases.gated.length > 0);
  assert.ok(cases.gated.every((e) => e.requires));
});
