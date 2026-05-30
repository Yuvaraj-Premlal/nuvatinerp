import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getPriceHistory, getLastPrice, addManualPrice } from '../controllers/itemprice.controller';

const router = Router();
router.get('/:item_id/history', authenticate, getPriceHistory);
router.get('/:item_id/last-price', authenticate, getLastPrice);
router.post('/:item_id/price', authenticate, addManualPrice);
export default router;
