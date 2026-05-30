import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { createVendor, getVendors, updateVendor, toggleVendorStatus, createJobWorkOrder, createJobWorkReceipt, getJobWorkOrders } from '../controllers/vendor.controller';

const router = Router();
router.get('/', authenticate, getVendors);
router.post('/', authenticate, createVendor);
router.put('/:id', authenticate, updateVendor);
router.patch('/:id/status', authenticate, toggleVendorStatus);
router.post('/job-work-orders', authenticate, createJobWorkOrder);
router.get('/job-work-orders', authenticate, getJobWorkOrders);
router.post('/job-work-receipts', authenticate, createJobWorkReceipt);
export default router;
