import { Router } from 'express';
import { createSalesOrder, getSalesOrders, createDispatch, getDispatches, getDispatchById, getSalesOrderById } from '../controllers/dispatch.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/sales-order', authenticate, createSalesOrder);
router.get('/sales-orders', authenticate, getSalesOrders);
router.post('/', authenticate, createDispatch);
router.get('/', authenticate, getDispatches);
router.get('/:id', authenticate, getDispatchById);
router.get('/sales-orders/:id', authenticate, getSalesOrderById);

export default router;