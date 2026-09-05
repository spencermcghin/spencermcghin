import { Router } from 'express';
import {
  createRuleset,
  deleteRuleset,
  getRuleset,
  importRuleset,
  listRulesets,
  replaceRuleset,
} from '../controllers/rulesetController';
import { createCharacter, listCharacters } from '../controllers/characterController';

const router = Router();

// Declared before /:id so "import" is not swallowed as a ruleset id.
router.post('/import', importRuleset);

router.get('/', listRulesets);
router.post('/', createRuleset);
router.get('/:id', getRuleset);
router.put('/:id', replaceRuleset);
router.delete('/:id', deleteRuleset);

// Characters are always created within a ruleset.
router.get('/:rulesetId/characters', listCharacters);
router.post('/:rulesetId/characters', createCharacter);

export default router;
