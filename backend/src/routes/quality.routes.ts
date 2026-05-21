import { Router } from 'express';
import { createInspection, logRejection, getInspectionsByJob, getRejections } from '../controllers/quality.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/inspection', authenticate, createInspection);
router.post('/rejection', authenticate, logRejection);
router.get('/inspection/:job_id', authenticate, getInspectionsByJob);
router.get('/rejections', authenticate, getRejections);

export default router;