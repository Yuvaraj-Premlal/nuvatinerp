import { Router } from 'express';
import { getStockBalance, getStockBalanceByItem, getStockMovements, issueMaterial, adjustStock, getStockReports, getAvailableBatches, requestFifoOverride, approveFifoOverride, getPendingFifoOverrides, getIssueHistory } from '../controllers/stock.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getStockBalance);
router.get('/movements', authenticate, getStockMovements);
router.post('/issue', authenticate, issueMaterial);
router.post('/adjust', authenticate, adjustStock);
router.get('/reports', authenticate, getStockReports);
router.get('/available-batches', authenticate, getAvailableBatches);
router.get('/issue-history', authenticate, getIssueHistory);
router.get('/fifo-overrides', authenticate, getPendingFifoOverrides);
router.post('/fifo-override-request', authenticate, requestFifoOverride);
router.post('/fifo-override-approve/:id', authenticate, approveFifoOverride);
router.get('/:item_id', authenticate, getStockBalanceByItem);

export default router;
