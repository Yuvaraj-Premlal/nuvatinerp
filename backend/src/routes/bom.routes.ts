import { Router } from 'express';
import { createBom, getBomByItem } from '../controllers/bom.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createBom);
router.get('/:item_id', authenticate, getBomByItem);

export default router;