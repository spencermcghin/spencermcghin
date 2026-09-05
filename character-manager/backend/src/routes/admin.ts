import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { listUsers, setAppRole } from '../controllers/adminController';

const router = Router();

router.use(requireAuth);

router.get('/users', listUsers);
router.patch('/users/:id', setAppRole);

export default router;
