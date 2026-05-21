import { Router } from 'express';
import { createPO, getPOs, updatePOStatus } from '../controllers/purchase.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createPO);
router.get('/', authenticate, getPOs);
router.put('/:id', authenticate, updatePOStatus);

export default router;