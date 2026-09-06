import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import {
  createRuleset,
  deleteRuleset,
  getRuleset,
  importRuleset,
  listRulesets,
  replaceRuleset,
} from '../controllers/rulesetController';
import {
  awardCurrency,
  createCharacter,
  listCharacters,
} from '../controllers/characterController';
import { getNarrative, saveNarrative } from '../controllers/narrativeController';
import {
  createInvite,
  listInvites,
  listMembers,
  removeMember,
  revokeInvite,
  updateMemberRole,
} from '../controllers/memberController';

const router = Router();

// Every project is membership-gated; nothing here is public.
router.use(requireAuth);

// Declared before /:id so "import" is not swallowed as a ruleset id.
router.post('/import', importRuleset);

router.get('/', listRulesets);
router.post('/', createRuleset);
router.get('/:id', getRuleset);
router.put('/:id', replaceRuleset);
router.delete('/:id', deleteRuleset);

router.get('/:id/members', listMembers);
router.patch('/:id/members/:userId', updateMemberRole);
router.delete('/:id/members/:userId', removeMember);

router.get('/:id/invites', listInvites);
router.post('/:id/invites', createInvite);
router.delete('/:id/invites/:inviteId', revokeInvite);

// The story map belongs to a project the way its rules do.
router.get('/:rulesetId/narrative', getNarrative);
router.put('/:rulesetId/narrative', saveNarrative);

// Characters are always created within a project.
router.get('/:rulesetId/characters', listCharacters);
router.post('/:rulesetId/characters', createCharacter);
// Declared before the bare collection route would ever see it; "award" is a
// verb on the collection, not a character id.
router.post('/:rulesetId/characters/award', awardCurrency);

export default router;
