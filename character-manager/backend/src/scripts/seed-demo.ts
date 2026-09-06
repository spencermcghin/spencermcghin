/**
 * Creates a demo account with a populated project, so a fresh install has
 * something worth looking at.
 *
 * Run explicitly -- never on boot. Seeding a known account automatically
 * would put predictable credentials on every deployment.
 *
 *   DATABASE_URL=postgres://... npm run seed:demo
 *
 * The password is generated and printed once unless DEMO_PASSWORD is set.
 */

import { randomBytes, randomUUID } from 'crypto';
import dotenv from 'dotenv';
import type { Character } from '../../../shared/rules-schema';
import { hashPassword, normalizeEmail } from '../auth/credentials';
import { closeStore, initStore, seedUserSpace } from '../db';

dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      'DATABASE_URL is not set. The in-memory store is discarded when this\n' +
        'process exits, so seeding it would accomplish nothing.'
    );
    process.exit(1);
  }

  const store = await initStore();

  const email = normalizeEmail(process.env.DEMO_EMAIL ?? 'demo@example.com');
  const password = process.env.DEMO_PASSWORD ?? randomBytes(12).toString('base64url');
  const displayName = process.env.DEMO_NAME ?? 'Demo Player';

  if (await store.findUserByEmail(email)) {
    console.error(
      `An account already exists for ${email}.\n` +
        'Set DEMO_EMAIL to seed a different one, or delete that account first.'
    );
    await closeStore();
    process.exit(1);
  }

  // Match the registration path: the first account administers the app.
  const isFirstUser = (await store.countUsers()) === 0;

  const user = await store.createUser({
    email,
    displayName,
    passwordHash: await hashPassword(password),
    appRole: isFirstUser ? 'admin' : 'user',
  });

  await seedUserSpace(store, user.id);
  const [project] = await store.listRulesetsForUser(user.id);

  const now = new Date().toISOString();
  const character = (
    name: string,
    over: Partial<Character>
  ): Character => ({
    id: randomUUID(),
    rulesetId: project.id,
    name,
    packageIds: [],
    traitLevels: {},
    trackPositions: {},
    qualityIds: [],
    awarded: { xp: 10, standing: 0, coin: 0 },
    fieldValues: { name },
    createdAt: now,
    updatedAt: now,
    ...over,
  });

  // Four builds against the demo ruleset, each showing the engine doing
  // something different. They are worth opening in order.
  const demoCharacters: Character[] = [
    // A quality gating a purchase, and a cost modifier that actually bites:
    // the Healer's reduction takes the medicine skills from 2 XP to 1.
    character('Lark Ferrow', {
      packageIds: ['healer'],
      qualityIds: ['healers-kit'],
      traitLevels: { 'herb-lore': 3, 'first-aid': 1 },
      fieldValues: {
        name: 'Lark Ferrow',
        origin: 'A fishing village that no longer has a name.',
        concept: 'Keeps a ledger of everyone she has failed to save.',
      },
    }),

    // A position on a track unlocking a skill. Pathfinding needs Reputation
    // 2, which is bought with Standing rather than Experience.
    character('Corvin Ashmoor', {
      packageIds: ['scout'],
      trackPositions: { reputation: 2 },
      traitLevels: { tracking: 1, athletics: 1, pathfinding: 1 },
      awarded: { xp: 10, standing: 16, coin: 0 },
      fieldValues: {
        name: 'Corvin Ashmoor',
        origin: 'The garrison road, mostly.',
        concept: 'Maps the country nobody has asked him to map.',
      },
    }),

    // Mid-build, with points still to spend and a menu of what they buy.
    character('Wren Halloway', {
      packageIds: ['merchant'],
      traitLevels: { haggling: 2, stealth: 1 },
      awarded: { xp: 12, standing: 0, coin: 0 },
      fieldValues: {
        name: 'Wren Halloway',
        origin: 'Three streets behind the grain market.',
        concept: 'Trades in tinctures and rumours, in roughly equal measure.',
      },
    }),

    // Deliberately illegal: Fletching 2 requires Smithing 2, and this
    // character has only Smithing 1. Opening the sheet shows the rules check
    // naming the problem rather than the app quietly allowing it.
    character('Thorin Ironforge', {
      traitLevels: { fletching: 2, smithing: 1 },
      fieldValues: {
        name: 'Thorin Ironforge',
        origin: 'A forge his brother now owns.',
        concept: 'Insists he taught himself bowyery. The rules disagree.',
      },
    }),
  ];

  for (const c of demoCharacters) {
    await store.putCharacter(c, user.id);
  }

  await closeStore();

  console.log('\n  Demo account created\n');
  console.log(`    Email     ${email}`);
  console.log(`    Password  ${password}`);
  console.log(`    App role  ${user.appRole}`);
  console.log(`    Project   ${project.name} (${demoCharacters.length} characters)\n`);
  if (!process.env.DEMO_PASSWORD) {
    console.log('  This password is not stored anywhere in readable form.');
    console.log('  Copy it now, or re-run with DEMO_EMAIL set to seed another.\n');
  }
}

main().catch(async (err) => {
  console.error(err);
  await closeStore().catch(() => {});
  process.exit(1);
});
