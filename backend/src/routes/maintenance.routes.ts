import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getWorkOrders, createWorkOrder, updateWorkOrder, addSpareUsage,
  getSchedules, createSchedule,
  getSpareParts, createSparePart,
  getMTBF_MTTR, getMaintenanceDashboard
} from '../controllers/maintenance.controller';

const router = Router();

router.get('/dashboard', authenticate, getMaintenanceDashboard);
router.get('/work-orders', authenticate, getWorkOrders);
router.post('/work-orders', authenticate, createWorkOrder);
router.put('/work-orders/:id', authenticate, updateWorkOrder);
router.post('/work-orders/:wo_id/spare-usage', authenticate, addSpareUsage);
router.get('/schedules', authenticate, getSchedules);
router.post('/schedules', authenticate, createSchedule);
router.get('/spare-parts', authenticate, getSpareParts);
router.post('/spare-parts', authenticate, createSparePart);
router.get('/mtbf-mttr', authenticate, getMTBF_MTTR);

export default router;
