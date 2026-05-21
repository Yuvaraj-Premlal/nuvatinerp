import { Router } from 'express';
import { createRouting, getRoutingByItem } from '../controllers/routing.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createRouting);
router.get('/:item_id', authenticate, getRoutingByItem);

export default router;