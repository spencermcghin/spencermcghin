import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { screen, screenMap } from './ingest-guard.mjs';

/**
 * The guard has to separate writing about the game from writing about the
 * people running it. Both appear in the same paragraph of the same minutes,
 * so the tests are drawn from real sentences on each side of that line.
 */

const IN_GAME = [
  'Stopping bleeding and setting bones where the injury happened.',
  'Obeah was cursed Oathbreaker despite upholding her oath to conduct the ritual.',
  'The Magistrate is the only figure with standing to remove that title.',
  'Players return to a Mystvale six months into a losing war.',
  'A dangerous expedition; wounded players cannot be got back to a surgeon in time.',
  'The Groundskeeper leads players in ward-making and a wayfinding puzzle.',
  'Chernabog trades auranium for storied items, provided a story is submitted.',
];

const PERSONNEL = [
  'Daario was shield-checked by a player named Kenny.',
  'Jessica apologised, agreeing that they should address concerns more directly.',
  'The team will prevent Jessica from signing up for NPC roles to mitigate burnout.',
  'James is second on the waitlist, while Kate is first.',
  'Their tone often felt passive-aggressive and hindered collaborative efforts.',
  'A staff member was made to cry due to miscommunication about makeup.',
  'Concerns regarding John missing deadlines for paper materials.',
  'Contact them at contact@eldritchlarp.com about the shift.',
];

test('in-game writing passes the guard', () => {
  for (const line of IN_GAME) {
    assert.deepEqual(screen(line), [], `should not have flagged: ${line}`);
  }
});

test('writing about the people running the game is flagged', () => {
  for (const line of PERSONNEL) {
    assert.ok(screen(line).length > 0, `should have flagged: ${line}`);
  }
});

test('the flag says what it caught and why', () => {
  const [found] = screen('Daario was shield-checked by a player named Kenny.');
  assert.ok(found.reason);
  assert.ok(found.matched);
});

test('the Eldritch map is clear', () => {
  // The map that actually ships. If this fails, something personnel-shaped
  // reached a document everyone in the project can read.
  const map = JSON.parse(readFileSync(new URL('./eldritch-narrative.json', import.meta.url)));
  assert.deepEqual(screenMap(map), []);
});

test('the guard reads every field a person would see', () => {
  const findings = screenMap({
    entities: [
      {
        id: 'x', name: 'A thing', aliases: [], tags: [], sources: [],
        body: 'John missed a deadline for the paper materials.',
      },
    ],
    relations: [{ id: 'r', note: 'Kate is first on the waitlist.', sources: [] }],
    entityKinds: [],
  });
  assert.equal(findings.length, 2);
  assert.ok(findings.some((f) => f.where.includes('entity')));
  assert.ok(findings.some((f) => f.where.includes('connection')));
});
