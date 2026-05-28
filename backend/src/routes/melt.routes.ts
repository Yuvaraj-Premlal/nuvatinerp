import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getFurnaces, createFurnace, updateFurnace,
  getAlloySpecs, createAlloySpec, updateAlloySpec,
  getMeltRecords, getMeltRecord, createMeltRecord, updateMeltStatus,
  addTemperatureLog, addChemistryLog
} from '../controllers/melt.controller';

const router = Router();

router.get('/furnaces', authenticate, getFurnaces);
router.post('/furnaces', authenticate, createFurnace);
router.put('/furnaces/:id', authenticate, updateFurnace);

router.get('/alloy-grades', authenticate, getAlloySpecs);
router.post('/alloy-grades', authenticate, createAlloySpec);
router.put('/alloy-grades/:id', authenticate, updateAlloySpec);

router.get('/records', authenticate, getMeltRecords);
router.get('/records/:id', authenticate, getMeltRecord);
router.post('/records', authenticate, createMeltRecord);
router.put('/records/:id/status', authenticate, updateMeltStatus);
router.post('/records/:id/temperature', authenticate, addTemperatureLog);
router.post('/records/:id/chemistry', authenticate, addChemistryLog);

export default router;
