import { Router } from 'express';
import { createSalesOrder, getSalesOrders, createDispatch, getDispatches } from '../controllers/dispatch.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/sales-order', authenticate, createSalesOrder);
router.get('/sales-orders', authenticate, getSalesOrders);
router.post('/', authenticate, createDispatch);
router.get('/', authenticate, getDispatches);

export default router;