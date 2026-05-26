import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getQuarantineStock, disposeQuarantineStock } from '../controllers/quarantine.controller';

const router = Router();
router.get('/', authenticate, getQuarantineStock);
router.post('/:id/dispose', authenticate, disposeQuarantineStock);

export default router;
