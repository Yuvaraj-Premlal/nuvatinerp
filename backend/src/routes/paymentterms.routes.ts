import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getPaymentTerms, createPaymentTerms, updatePaymentTerms } from '../controllers/paymentterms.controller';

const router = Router();
router.get('/', authenticate, getPaymentTerms);
router.post('/', authenticate, createPaymentTerms);
router.put('/:id', authenticate, updatePaymentTerms);
export default router;
