/**
 * Loads the Eldritch project -- the full ruleset and the extracted story map --
 * into one account.
 *
 *   DATABASE_URL=postgres://... ELDRITCH_EMAIL=you@example.com npm run seed:eldritch
 *
 * Separate from seed:demo, and never run on boot, because Eldritch is one
 * group's game rather than an example anyone would want. New accounts get the
 * Demo Rules Set; this is opt-in and goes to the account you name.
 *
 * Both halves come from files that are already checked in and already tested:
 * the ruleset from shared/rulesets/eldritch.ts, the map from
 * tools/eldritch-narrative.json. Nothing here transcribes anything, so this
 * cannot drift from what the tests run against.
 *
 * Re-running replaces the project's rules and map in place rather than making
 * a second copy, so this is the way to push a corrected transcription to a
 * deployment.
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
import type { NarrativeMap } from '../../../shared/narrative-schema';
import { validateMap } from '../../../shared/narrative';
import { eldritch } from '../../../shared/rulesets/eldritch';
import { hashPassword, normalizeEmail } from '../auth/credentials';
import { closeStore, initStore } from '../db';

dotenv.config();

const PROJECT_ID = 'eldritch';
const MAP_FILE = join('tools', 'eldritch-narrative.json');

/**
 * Finds the checked-in map by walking up from this file.
 *
 * Compiled, this runs from backend/dist/backend/src/scripts; under ts-node it
 * runs from backend/src/scripts. Those are different distances from the repo
 * root, so a fixed number of `..` segments works in one and not the other --
 * which is exactly how the first version of this script failed.
 */
function findMap(): string {
  let dir = __dirname;
  for (let up = 0; up < 8; up += 1) {
    const candidate = join(dir, MAP_FILE);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  console.error(
    `Could not find ${MAP_FILE} above ${__dirname}.\n` +
      'It is checked in at the repository root; this script has to run from a checkout.'
  );
  process.exit(1);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      'DATABASE_URL is not set. The in-memory store belongs to the server\n' +
        'process and is discarded when this one exits, so seeding it would\n' +
        'accomplish nothing.'
    );
    process.exit(1);
  }

  const map = JSON.parse(readFileSync(findMap(), 'utf8')) as NarrativeMap;

  // The same cross-check the story page runs. Seeding a map whose gates point
  // at skills the ruleset does not have would put content in front of people
  // that nothing can open, and the failure would surface as a puzzle rather
  // than as an error.
  const issues = validateMap({ ...map, rulesetId: PROJECT_ID }, eldritch);
  const errors = issues.filter((i) => i.severity === 'error');
  if (errors.length > 0) {
    console.error(`The story map does not hold up against the ruleset:\n`);
    for (const issue of errors) console.error(`  ${issue.message}`);
    process.exit(1);
  }

  const store = await initStore();

  const email = normalizeEmail(process.env.ELDRITCH_EMAIL ?? '');
  if (!email) {
    console.error('Set ELDRITCH_EMAIL to the account that should own the project.');
    await closeStore();
    process.exit(1);
  }

  const found = await store.findUserByEmail(email);
  let ownerId = found?.id;
  let password: string | undefined;
  if (!ownerId) {
    // Creating the account is a convenience for a fresh deployment. The
    // password is generated and printed once rather than defaulted, so no
    // deployment ends up with a known login.
    password = process.env.ELDRITCH_PASSWORD ?? randomBytes(12).toString('base64url');
    const isFirstUser = (await store.countUsers()) === 0;
    const created = await store.createUser({
      email,
      displayName: process.env.ELDRITCH_NAME ?? 'Eldritch Staff',
      passwordHash: await hashPassword(password),
      appRole: isFirstUser ? 'admin' : 'user',
    });
    ownerId = created.id;
  }

  const existing = await store.getRuleset(PROJECT_ID);
  await store.putRuleset({ ...eldritch, id: PROJECT_ID }, ownerId);
  await store.addMember(PROJECT_ID, ownerId, 'admin');
  await store.putNarrative({
    ...map,
    rulesetId: PROJECT_ID,
    updatedAt: new Date().toISOString(),
  });

  await closeStore();

  const skills = eldritch.traits.length;
  const levels = eldritch.traits.reduce((n, t) => n + t.tiers.length, 0);
  console.log(`\n  Eldritch ${existing ? 'updated' : 'loaded'} for ${email}\n`);
  console.log(`    Rules   ${skills} skills across ${levels} levels, ${eldritch.packages.length} archetypes`);
  console.log(`    Story   ${map.entities.length} entries, ${map.relations.length} connections`);
  console.log(`    Open    /projects/${PROJECT_ID}\n`);
  if (password) {
    console.log(`    A new account was created. Password: ${password}`);
    console.log('    This is printed once. Change it after signing in.\n');
  }
}

main().catch(async (err) => {
  console.error(err);
  await closeStore();
  process.exit(1);
});
