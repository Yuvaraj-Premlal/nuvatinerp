import { Router } from 'express';
import { getFactoryStatus } from '../controllers/factory.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/status', authenticate, getFactoryStatus);

export default router;
