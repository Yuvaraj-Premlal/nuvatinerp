import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getDailyThroughput,
  getMonthlyThroughput,
  getMonthlyOperatingStatement,
  getMonthlyFinanceStatement,
  getFixedAssets,
  createFixedAsset,
  getLoanAccounts,
  createLoanAccount
} from '../controllers/reports.controller';

const router = Router();

router.get('/finance/daily-throughput', authenticate, getDailyThroughput);
router.get('/finance/monthly-throughput', authenticate, getMonthlyThroughput);
router.get('/finance/monthly-operating', authenticate, getMonthlyOperatingStatement);
router.get('/finance/monthly-statement', authenticate, getMonthlyFinanceStatement);

router.get('/fixed-assets', authenticate, getFixedAssets);
router.post('/fixed-assets', authenticate, createFixedAsset);
router.get('/loans', authenticate, getLoanAccounts);
router.post('/loans', authenticate, createLoanAccount);

export default router;
