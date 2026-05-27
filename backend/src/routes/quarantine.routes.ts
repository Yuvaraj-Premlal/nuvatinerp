import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getQuarantineStock, disposeQuarantineStock, moveToQuarantine } from '../controllers/quarantine.controller';

const router = Router();
router.get('/', authenticate, getQuarantineStock);
router.post('/:id/dispose', authenticate, disposeQuarantineStock);
router.post('/move', authenticate, moveToQuarantine);

export default router;
