import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { createCustomer, getCustomers, updateCustomer, toggleCustomerStatus } from '../controllers/customer.controller';

const router = Router();
router.get('/', authenticate, getCustomers);
router.post('/', authenticate, createCustomer);
router.put('/:id', authenticate, updateCustomer);
router.patch('/:id/status', authenticate, toggleCustomerStatus);
export default router;
