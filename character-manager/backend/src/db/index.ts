import { eldritch } from '../../../shared/rulesets/eldritch';
import { MemoryStore } from './memory-store';
import { PostgresStore } from './postgres-store';
import type { Store } from './store';

export type { Store, RulesetSummary } from './store';

let store: Store | null = null;

export function getStore(): Store {
  if (!store) throw new Error('Store accessed before initStore() completed.');
  return store;
}

export async function initStore(): Promise<Store> {
  const url = process.env.DATABASE_URL;

  if (url) {
    store = new PostgresStore(url);
    await store.init();
    console.log('Store: postgres');
  } else {
    store = new MemoryStore();
    await store.init();
    console.warn(
      'Store: in-memory (DATABASE_URL is not set). Data will be lost on restart.'
    );
  }

  await seed(store);
  return store;
}

/**
 * Installs Eldritch as a starter ruleset on an empty database, so a fresh
 * deploy has something real to open. Existing data is never overwritten.
 */
async function seed(s: Store): Promise<void> {
  const existing = await s.listRulesets();
  if (existing.length > 0) return;
  await s.putRuleset(eldritch);
  console.log('Seeded starter ruleset: Eldritch');
}
