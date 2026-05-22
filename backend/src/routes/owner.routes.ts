import { Router } from 'express';
import { getOwnerDashboard } from '../controllers/owner.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/dashboard', authenticate, getOwnerDashboard);

export default router;
