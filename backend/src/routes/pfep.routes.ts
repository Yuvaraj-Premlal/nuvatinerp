import { Router } from 'express';
import { createOrUpdatePfep, getPfepByItem } from '../controllers/pfep.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/:item_id', authenticate, createOrUpdatePfep);
router.get('/:item_id', authenticate, getPfepByItem);

export default router;
