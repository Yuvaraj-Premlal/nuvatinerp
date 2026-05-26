import { Router } from 'express';
import { getBatches, getBatchTrace } from '../controllers/batch.controller';
import { authenticate } from '../middleware/auth.middleware';
const router = Router();
router.get('/', authenticate, getBatches);
router.get('/:batch_number', authenticate, getBatchTrace);
export default router;
