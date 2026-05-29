import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMRs, createMR, updateMRStatus, fulfillMRLine, escalateToPR, getPRs, getAlerts, markAlertRead, resolveAlert } from '../controllers/mr.controller';

const router = Router();

router.get('/mr', authenticate, getMRs);
router.post('/mr', authenticate, createMR);
router.put('/mr/:id/status', authenticate, updateMRStatus);
router.put('/mr/line/:line_id/fulfill', authenticate, fulfillMRLine);
router.post('/mr/:id/escalate-pr', authenticate, escalateToPR);
router.get('/pr', authenticate, getPRs);
router.get('/alerts', authenticate, getAlerts);
router.put('/alerts/:id/read', authenticate, markAlertRead);
router.put('/alerts/:id/resolve', authenticate, resolveAlert);

export default router;
