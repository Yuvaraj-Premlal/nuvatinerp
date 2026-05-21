import { Router } from 'express';
import { createGRN, getGRNs } from '../controllers/grn.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createGRN);
router.get('/', authenticate, getGRNs);

export default router;