import { Router } from 'express';
import { detectConstraint, setConstraintConfig, getConstraintConfig, getPriorityQueue, getBufferStatus, getShiftSummary, getDashboard } from '../controllers/toc.controller';
import { runTOCSchedule } from '../jobs/toc.scheduler';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/detect-constraint', authenticate, detectConstraint);
router.post('/constraint', authenticate, setConstraintConfig);
router.get('/constraint', authenticate, getConstraintConfig);
router.get('/priority-queue', authenticate, getPriorityQueue);
router.get('/buffer', authenticate, getBufferStatus);
router.get('/shift-summary', authenticate, getShiftSummary);
router.get('/dashboard', authenticate, getDashboard);
router.post('/run-now', authenticate, async (req: any, res: any) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const result = await runTOCSchedule(tenant_id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
