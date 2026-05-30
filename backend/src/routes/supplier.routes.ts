import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { createSupplier, getSuppliers, getSupplierById, updateSupplier, toggleSupplierStatus } from '../controllers/supplier.controller';

const router = Router();
router.get('/', authenticate, getSuppliers);
router.get('/:id', authenticate, getSupplierById);
router.post('/', authenticate, createSupplier);
router.put('/:id', authenticate, updateSupplier);
router.patch('/:id/status', authenticate, toggleSupplierStatus);
export default router;
