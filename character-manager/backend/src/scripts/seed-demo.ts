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
    awarded: { cp: 4, influence: 0, coin: 0 },
    fieldValues: { name },
    createdAt: now,
    updatedAt: now,
    ...over,
  });

  const demoCharacters: Character[] = [
    // Spends its whole budget legally: Gentry costs 4 and grants both skills.
    character('Seraphine Vale', {
      packageIds: ['gentry'],
      traitLevels: { academics: 1, income: 1 },
      fieldValues: {
        name: 'Seraphine Vale',
        house: 'House Innis',
        background:
          'Sworn to the Thornwood after her order fell. Speaks little of the siege.',
      },
    }),

    // Advanced archetype at Rank 2, which unlocks the signature skill.
    character('Corvin Ashmoor', {
      packageIds: ['knight'],
      trackPositions: { rank: 2 },
      traitLevels: { 'shield-wall': 1 },
      awarded: { cp: 12, influence: 40, coin: 0 },
      fieldValues: {
        name: 'Corvin Ashmoor',
        house: 'House Richter',
        background: 'Catalogues relics no one else will touch. Three fingers missing.',
      },
    }),

    // Mid-build with points still to spend.
    character('Wren Halloway', {
      packageIds: ['apothecary'],
      traitLevels: { alchemy: 1, herbalism: 1, academics: 1 },
      awarded: { cp: 10, influence: 0, coin: 0 },
      fieldValues: {
        name: 'Wren Halloway',
        background: 'Trades in tinctures and rumours, in roughly equal measure.',
      },
    }),

    // Deliberately illegal: Bowyer requires Artificer 1, which this character
    // does not have. Opening this sheet shows the rules check catching it.
    character('Thorin Ironforge', {
      packageIds: ['commonfolk'],
      traitLevels: { bowyer: 1 },
      awarded: { cp: 4, influence: 0, coin: 0 },
      fieldValues: {
        name: 'Thorin Ironforge',
        background: 'Insists he learned bowyery on his own. The rules disagree.',
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
