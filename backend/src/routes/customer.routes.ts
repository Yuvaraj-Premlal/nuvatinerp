import { Router } from 'express';
import { createCustomer, getCustomers } from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.post('/', authenticate, createCustomer);
router.get('/', authenticate, getCustomers);
export default router;
