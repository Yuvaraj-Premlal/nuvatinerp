import { Router } from 'express';
import { createJobCard, getJobCards, getJobCardById, updateJobCardStatus, logShot, logDowntime } from '../controllers/jobcard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createJobCard);
router.get('/', authenticate, getJobCards);
router.get('/:id', authenticate, getJobCardById);
router.put('/:id/status', authenticate, updateJobCardStatus);
router.post('/:id/shot', authenticate, logShot);
router.post('/:id/downtime', authenticate, logDowntime);

export default router;