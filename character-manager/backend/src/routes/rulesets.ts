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
import {
  getNarrative,
  getNarrativeGates,
  saveNarrative,
} from '../controllers/narrativeController';
import {
  addSourceFolder,
  listSources,
  removeSourceFolder,
  reviewSource,
  syncSources,
} from '../controllers/sourceController';
import {
  createAccessRole,
  createInvite,
  deleteAccessRole,
  listAccessRoles,
  listInvites,
  listMembers,
  removeMember,
  revokeInvite,
  setMemberAccessRoles,
  updateAccessRole,
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
router.put('/:id/members/:userId/access-roles', setMemberAccessRoles);
router.delete('/:id/members/:userId', removeMember);

// Role definitions belong to the project's governance, beside its members.
router.get('/:id/access-roles', listAccessRoles);
router.post('/:id/access-roles', createAccessRole);
router.patch('/:id/access-roles/:roleId', updateAccessRole);
router.delete('/:id/access-roles/:roleId', deleteAccessRole);

router.get('/:id/invites', listInvites);
router.post('/:id/invites', createInvite);
router.delete('/:id/invites/:inviteId', revokeInvite);

// The source ledger: which documents the canon was written from, and
// whether they have drifted since.
router.get('/:id/sources', listSources);
router.post('/:id/sources/sync', syncSources);
router.post('/:id/sources/:docId/review', reviewSource);
router.post('/:id/source-folders', addSourceFolder);
router.delete('/:id/source-folders/:folderId', removeSourceFolder);

// The story map belongs to a project the way its rules do. The gates
// report is declared before the bare narrative route so "gates" is not
// read as part of the map path.
router.get('/:rulesetId/narrative/gates', getNarrativeGates);
router.get('/:rulesetId/narrative', getNarrative);
router.put('/:rulesetId/narrative', saveNarrative);

// Characters are always created within a project.
router.get('/:rulesetId/characters', listCharacters);
router.post('/:rulesetId/characters', createCharacter);
// Declared before the bare collection route would ever see it; "award" is a
// verb on the collection, not a character id.
router.post('/:rulesetId/characters/award', awardCurrency);

export default router;
