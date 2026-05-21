import { Router } from 'express';
import { createSupplier, getSuppliers, getSupplierById } from '../controllers/supplier.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createSupplier);
router.get('/', authenticate, getSuppliers);
router.get('/:id', authenticate, getSupplierById);

export default router;