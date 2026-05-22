import { Router } from 'express';
import { detectConstraint, setConstraintConfig, getConstraintConfig, getPriorityQueue, getBufferStatus, getShiftSummary, getDashboard } from '../controllers/toc.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/detect-constraint', authenticate, detectConstraint);
router.post('/constraint', authenticate, setConstraintConfig);
router.get('/constraint', authenticate, getConstraintConfig);
router.get('/priority-queue', authenticate, getPriorityQueue);
router.get('/buffer', authenticate, getBufferStatus);
router.get('/shift-summary', authenticate, getShiftSummary);
router.get('/dashboard', authenticate, getDashboard);

export default router;
