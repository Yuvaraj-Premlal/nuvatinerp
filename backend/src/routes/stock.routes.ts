import { Router } from 'express';
import { getStockBalance, getStockBalanceByItem } from '../controllers/stock.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getStockBalance);
router.get('/:item_id', authenticate, getStockBalanceByItem);

export default router;