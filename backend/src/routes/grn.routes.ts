import { Router } from 'express';
import { createGRN, getGRNs, reverseGRN } from '../controllers/grn.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createGRN);
router.get('/', authenticate, getGRNs);
router.post('/:id/reverse', authenticate, reverseGRN);

export default router;