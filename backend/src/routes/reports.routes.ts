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
  createLoanAccount,
  getShiftReport,
  getMonthlyProductionSummary,
  getCustomerOTIF,
  getRejectionTrend,
  getDieHealthReport,
  getSupplierPerformance
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

router.get('/production/shift', authenticate, getShiftReport);
router.get('/production/monthly-summary', authenticate, getMonthlyProductionSummary);
router.get('/quality/otif', authenticate, getCustomerOTIF);
router.get('/quality/rejection-trend', authenticate, getRejectionTrend);
router.get('/maintenance/die-health', authenticate, getDieHealthReport);
router.get('/purchase/supplier-performance', authenticate, getSupplierPerformance);

export default router;
