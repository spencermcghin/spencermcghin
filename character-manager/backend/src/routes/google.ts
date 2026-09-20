import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import {
  googleCallback,
  googleConnect,
  googleDisconnect,
  googleStatus,
} from '../controllers/sourceController';

const router = Router();

router.use(requireAuth);

router.get('/status', googleStatus);
router.get('/connect', googleConnect);
router.get('/connect/callback', googleCallback);
router.delete('/', googleDisconnect);

export default router;
