import { Router } from 'express';
import { createItem, getItems, getItemById, updateItem, toggleItemStatus } from '../controllers/item.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createItem);
router.get('/', authenticate, getItems);
router.get('/:id', authenticate, getItemById);
router.put('/:id', authenticate, updateItem);

router.patch('/:id/status', authenticate, toggleItemStatus);
export default router;
