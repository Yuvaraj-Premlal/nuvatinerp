import { Router } from 'express';
import { createVendor, getVendors, createJobWorkOrder, createJobWorkReceipt, getJobWorkOrders } from '../controllers/vendor.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createVendor);
router.get('/', authenticate, getVendors);
router.post('/job-work', authenticate, createJobWorkOrder);
router.post('/job-work-receipt', authenticate, createJobWorkReceipt);
router.get('/job-work', authenticate, getJobWorkOrders);

export default router;