import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { acceptInvite, previewInvite } from '../controllers/memberController';

const router = Router();

// Joining requires an account, so the invite can be attached to someone.
router.use(requireAuth);

router.get('/:token', previewInvite);
router.post('/:token/accept', acceptInvite);

export default router;
