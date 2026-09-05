import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import {
  deleteCharacter,
  getCharacter,
  getCharacterSheet,
  updateCharacter,
} from '../controllers/characterController';

const router = Router();

// Every ruleset and character is owned; nothing here is public.
router.use(requireAuth);

router.get('/:id', getCharacter);
router.get('/:id/sheet', getCharacterSheet);
router.put('/:id', updateCharacter);
router.delete('/:id', deleteCharacter);

export default router;
