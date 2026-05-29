import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMWOs, getMWO, createMWO, updateMWOStatus, getMWOIssuedMaterial } from '../controllers/mwo.controller';

const router = Router();

router.get('/', authenticate, getMWOs);
router.get('/:id', authenticate, getMWO);
router.post('/', authenticate, createMWO);
router.put('/:id/status', authenticate, updateMWOStatus);
router.get('/:id/issued-material', authenticate, getMWOIssuedMaterial);

export default router;
