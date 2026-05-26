import { Router } from 'express';
import { getStockBalance, getStockBalanceByItem, getStockMovements, issueMaterial, adjustStock } from '../controllers/stock.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getStockBalance);
router.get('/movements', authenticate, getStockMovements);
router.post('/issue', authenticate, issueMaterial);
router.post('/adjust', authenticate, adjustStock);
router.get('/:item_id', authenticate, getStockBalanceByItem);

export default router;
