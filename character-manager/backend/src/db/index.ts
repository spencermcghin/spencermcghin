import { randomUUID } from 'crypto';
import { demoRuleset } from '../../../shared/rulesets/demo';
import { MemoryStore } from './memory-store';
import { PostgresStore } from './postgres-store';
import type { Store } from './store';

export type {
  Store,
  RulesetSummary,
  User,
  UserWithSecret,
  Owned,
  Member,
  Invite,
  CharacterRow,
} from './store';

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
 * Gives a new account something to open instead of an empty app: a private
 * copy of the demo ruleset, which is written to be taken apart.
 *
 * Deliberately a generic set rather than a real published game. Someone
 * seeing this app for the first time needs to learn the tool, and a real
 * game's ruleset teaches them the game instead -- along with a pile of rules
 * they did not ask for and cannot check against their own book.
 *
 * A copy rather than a shared reference, so editing it cannot affect anyone
 * else. Ruleset ids are globally unique, hence the suffix.
 */
export async function seedUserSpace(s: Store, ownerId: string): Promise<void> {
  const copy = {
    ...structuredClone(demoRuleset),
    id: `demo-${randomUUID().slice(0, 8)}`,
  };
  await s.putRuleset(copy, ownerId);
  // The creator is a project admin; without this row they could not open the
  // project they just received.
  await s.addMember(copy.id, ownerId, 'admin');
}
