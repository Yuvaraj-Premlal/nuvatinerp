import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getPaymentTerms, createPaymentTerms, updatePaymentTerms, togglePaymenttermsStatus } from '../controllers/paymentterms.controller';

const router = Router();
router.get('/', authenticate, getPaymentTerms);
router.post('/', authenticate, createPaymentTerms);
router.put('/:id', authenticate, updatePaymentTerms);
router.patch('/:id/status', authenticate, togglePaymenttermsStatus);
export default router;
