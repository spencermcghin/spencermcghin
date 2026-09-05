import { Router } from 'express';
import {
  deleteCharacter,
  getCharacter,
  getCharacterSheet,
  updateCharacter,
} from '../controllers/characterController';

const router = Router();

router.get('/:id', getCharacter);
router.get('/:id/sheet', getCharacterSheet);
router.put('/:id', updateCharacter);
router.delete('/:id', deleteCharacter);

export default router;
