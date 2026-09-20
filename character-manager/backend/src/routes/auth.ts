import { Router } from 'express';
import {
  deleteAccount,
  exportData,
  login,
  logout,
  me,
  register,
} from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', me);
router.get('/export', exportData);
router.delete('/account', deleteAccount);

export default router;
