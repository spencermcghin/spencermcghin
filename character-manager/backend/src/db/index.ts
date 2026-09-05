import { randomUUID } from 'crypto';
import { eldritch } from '../../../shared/rulesets/eldritch';
import { MemoryStore } from './memory-store';
import { PostgresStore } from './postgres-store';
import type { Store } from './store';

export type { Store, RulesetSummary, User, UserWithSecret, Owned } from './store';

let store: Store | null = null;
let sweeper: NodeJS.Timeout | null = null;

const SESSION_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

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

  // Expired rows are already ignored on lookup; this just stops the table
  // growing without bound.
  const sweep = () => {
    void store
      ?.deleteExpiredSessions()
      .catch((err) => console.error('Session sweep failed:', err));
  };
  sweep();
  sweeper = setInterval(sweep, SESSION_SWEEP_INTERVAL_MS);
  sweeper.unref?.();

  return store;
}

export async function closeStore(): Promise<void> {
  if (sweeper) clearInterval(sweeper);
  await store?.close();
  store = null;
}

/**
 * Gives a new account something real to open instead of an empty app: a
 * private copy of Eldritch, which doubles as a worked example of what a
 * ruleset can express.
 *
 * A copy rather than a shared reference, so editing it cannot affect anyone
 * else. Ruleset ids are globally unique, hence the suffix.
 */
export async function seedUserSpace(s: Store, ownerId: string): Promise<void> {
  const copy = {
    ...structuredClone(eldritch),
    id: `eldritch-${randomUUID().slice(0, 8)}`,
  };
  await s.putRuleset(copy, ownerId);
}
