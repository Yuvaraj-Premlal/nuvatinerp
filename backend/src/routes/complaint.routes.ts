import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getComplaints, getComplaintById, createComplaint,
  updateComplaintAction, closeComplaint, getComplaintSummary
} from '../controllers/complaint.controller';

const router = Router();

router.get('/', authenticate, getComplaints);
router.get('/summary', authenticate, getComplaintSummary);
router.get('/:id', authenticate, getComplaintById);
router.post('/', authenticate, createComplaint);
router.put('/actions/:action_id', authenticate, updateComplaintAction);
router.post('/:id/close', authenticate, closeComplaint);

export default router;
