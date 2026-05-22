import { Router } from 'express';
import { getCostConfig, setCostConfig, getJobCardCost } from '../controllers/costing.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/config', authenticate, getCostConfig);
router.post('/config', authenticate, setCostConfig);
router.get('/job-card/:job_id', authenticate, getJobCardCost);

export default router;
