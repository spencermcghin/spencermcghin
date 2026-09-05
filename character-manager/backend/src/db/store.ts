import type { Character, Ruleset } from '../../../shared/rules-schema';

export interface RulesetSummary {
  id: string;
  name: string;
  version: string;
  description?: string;
  characterCount: number;
  updatedAt: string;
}

/**
 * Persistence boundary. Rulesets and characters are stored as documents --
 * a Ruleset is a deeply nested tree with polymorphic Condition nodes that is
 * always read and written whole, so normalizing it into tables would add
 * machinery without buying a query we actually need.
 */
export interface Store {
  init(): Promise<void>;
  close(): Promise<void>;

  listRulesets(): Promise<RulesetSummary[]>;
  getRuleset(id: string): Promise<Ruleset | null>;
  putRuleset(ruleset: Ruleset): Promise<Ruleset>;
  deleteRuleset(id: string): Promise<boolean>;

  listCharacters(rulesetId: string): Promise<Character[]>;
  getCharacter(id: string): Promise<Character | null>;
  putCharacter(character: Character): Promise<Character>;
  deleteCharacter(id: string): Promise<boolean>;
}
