import { Router } from 'express';
import { createGRN, getGRNs, getGRNById, reverseGRN } from '../controllers/grn.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createGRN);
router.get('/', authenticate, getGRNs);
router.get('/:id', authenticate, getGRNById);
router.post('/:id/reverse', authenticate, reverseGRN);

export default router;