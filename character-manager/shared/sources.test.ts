import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyNarrativeMap } from './narrative-schema';
import type { NarrativeMap } from './narrative-schema';
import {
  citationsOf,
  citedBy,
  extractDriveId,
  statusOf,
  type SourceDocument,
} from './sources';

test('extractDriveId reads the URL shapes Drive hands out', () => {
  assert.equal(
    extractDriveId('https://docs.google.com/document/d/1AbC-def_2345678901/edit'),
    '1AbC-def_2345678901'
  );
  assert.equal(
    extractDriveId('https://drive.google.com/file/d/1AbC-def_2345678901/view?usp=sharing'),
    '1AbC-def_2345678901'
  );
  assert.equal(
    extractDriveId('https://drive.google.com/open?id=1AbC-def_2345678901'),
    '1AbC-def_2345678901'
  );
  assert.equal(
    extractDriveId('https://drive.google.com/drive/folders/1AbC-def_2345678901'),
    '1AbC-def_2345678901'
  );
  assert.equal(extractDriveId('https://example.com/d/1AbC-def_2345678901'), null);
  assert.equal(extractDriveId('https://docs.google.com/'), null);
});

function mapWith(): NarrativeMap {
  const m = emptyNarrativeMap('r1');
  m.entityKinds = [{ id: 'k', label: 'Thing', plural: 'Things' }];
  m.relationKinds = [{ id: 'link', label: 'links', inverseLabel: 'is linked by' }];
  m.entities = [
    {
      id: 'a',
      kindId: 'k',
      name: 'A',
      aliases: [],
      tags: [],
      status: 'canon',
      sources: [
        { label: 'Doc', url: 'https://docs.google.com/document/d/1AbC-def_2345678901/edit' },
      ],
    },
    {
      id: 'b',
      kindId: 'k',
      name: 'B',
      aliases: [],
      tags: [],
      status: 'canon',
      sources: [{ label: 'Page', url: 'https://example.com/lore' }],
    },
  ];
  m.relations = [
    {
      id: 'rel1',
      kindId: 'link',
      fromId: 'a',
      toId: 'b',
      sources: [
        { label: 'Doc again', url: 'https://drive.google.com/open?id=1AbC-def_2345678901' },
      ],
    },
  ];
  return m;
}

test('citations match by Drive id across URL shapes, and by exact URL otherwise', () => {
  const citations = citationsOf(mapWith());
  // The entity source and the relation source are the same document in
  // two different URL dressings; both entities of the relation count.
  assert.deepEqual(
    [...(citations.get('1AbC-def_2345678901') ?? [])].sort(),
    ['a', 'b']
  );
  assert.deepEqual([...(citations.get('https://example.com/lore') ?? [])], ['b']);
});

const doc = (over: Partial<SourceDocument>): SourceDocument => ({
  id: 'd1',
  rulesetId: 'r1',
  folderId: 'f1',
  externalId: '1AbC-def_2345678901',
  name: 'Doc',
  url: 'https://docs.google.com/document/d/1AbC-def_2345678901/edit',
  modifiedAt: '2026-01-01T00:00:00Z',
  firstSeenAt: '2026-01-02T00:00:00Z',
  lastSeenAt: '2026-01-02T00:00:00Z',
  reviewedAt: null,
  missingAt: null,
  ...over,
});

test('a document is current when unchanged since review and cited', () => {
  const citations = citationsOf(mapWith());
  const d = doc({});
  assert.deepEqual(citedBy(d, citations).sort(), ['a', 'b']);
  assert.equal(statusOf(d, citedBy(d, citations)), 'current');
});

test('a change after review marks it stale, and a review clears it', () => {
  const citations = citationsOf(mapWith());
  const changed = doc({ modifiedAt: '2026-02-01T00:00:00Z' });
  assert.equal(statusOf(changed, citedBy(changed, citations)), 'stale');
  const reviewed = doc({
    modifiedAt: '2026-02-01T00:00:00Z',
    reviewedAt: '2026-02-02T00:00:00Z',
  });
  assert.equal(statusOf(reviewed, citedBy(reviewed, citations)), 'current');
});

test('unknown documents are uncited; vanished cited documents are missing', () => {
  const citations = citationsOf(mapWith());
  const stranger = doc({ externalId: 'zzz-not-cited-9999', url: 'https://drive.google.com/file/d/zzz-not-cited-9999/view' });
  assert.equal(statusOf(stranger, citedBy(stranger, citations)), 'uncited');
  const gone = doc({ missingAt: '2026-03-01T00:00:00Z' });
  assert.equal(statusOf(gone, citedBy(gone, citations)), 'missing');
  const goneStranger = doc({
    externalId: 'zzz-not-cited-9999',
    url: 'https://drive.google.com/file/d/zzz-not-cited-9999/view',
    missingAt: '2026-03-01T00:00:00Z',
  });
  assert.equal(statusOf(goneStranger, citedBy(goneStranger, citations)), 'uncited');
});

test('staleness outranks uncited: a changed unmapped document still asks for a decision', () => {
  const citations = citationsOf(mapWith());
  const changedStranger = doc({
    externalId: 'zzz-not-cited-9999',
    url: 'https://drive.google.com/file/d/zzz-not-cited-9999/view',
    modifiedAt: '2026-02-01T00:00:00Z',
  });
  assert.equal(statusOf(changedStranger, citedBy(changedStranger, citations)), 'stale');
});
