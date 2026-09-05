import type { Character, Ruleset } from '../../../shared/rules-schema';
import type { RulesetSummary, Store } from './store';

/**
 * In-memory fallback used when DATABASE_URL is unset, so `npm run dev` works
 * with no database to install. Data is lost on restart -- the server logs a
 * warning at startup so this is never mistaken for real persistence.
 */
export class MemoryStore implements Store {
  private rulesets = new Map<string, Ruleset>();
  private characters = new Map<string, Character>();
  private touched = new Map<string, string>();

  async init(): Promise<void> {}
  async close(): Promise<void> {}

  async listRulesets(): Promise<RulesetSummary[]> {
    return [...this.rulesets.values()]
      .map((r) => ({
        id: r.id,
        name: r.name,
        version: r.version,
        description: r.description,
        characterCount: [...this.characters.values()].filter((c) => c.rulesetId === r.id)
          .length,
        updatedAt: this.touched.get(r.id) ?? new Date(0).toISOString(),
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getRuleset(id: string): Promise<Ruleset | null> {
    return this.rulesets.get(id) ?? null;
  }

  async putRuleset(ruleset: Ruleset): Promise<Ruleset> {
    this.rulesets.set(ruleset.id, ruleset);
    this.touched.set(ruleset.id, new Date().toISOString());
    return ruleset;
  }

  async deleteRuleset(id: string): Promise<boolean> {
    for (const [cid, c] of this.characters) {
      if (c.rulesetId === id) this.characters.delete(cid);
    }
    this.touched.delete(id);
    return this.rulesets.delete(id);
  }

  async listCharacters(rulesetId: string): Promise<Character[]> {
    return [...this.characters.values()]
      .filter((c) => c.rulesetId === rulesetId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCharacter(id: string): Promise<Character | null> {
    return this.characters.get(id) ?? null;
  }

  async putCharacter(character: Character): Promise<Character> {
    this.characters.set(character.id, character);
    return character;
  }

  async deleteCharacter(id: string): Promise<boolean> {
    return this.characters.delete(id);
  }
}
