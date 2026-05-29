import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getCostCentres, createCostCentre, updateCostCentre } from '../controllers/costcentre.controller';

const router = Router();
router.get('/', authenticate, getCostCentres);
router.post('/', authenticate, createCostCentre);
router.put('/:id', authenticate, updateCostCentre);
export default router;
