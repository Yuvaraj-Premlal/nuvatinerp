import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getEntityHistory } from '../controllers/auditlog.controller';

const router = Router();
router.get('/:entity_type/:entity_id', authenticate, getEntityHistory);
export default router;
