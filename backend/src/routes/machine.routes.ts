import { Router } from 'express';
import { createMachine, getMachines, updateMachine } from '../controllers/machine.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createMachine);
router.get('/', authenticate, getMachines);
router.put('/:id', authenticate, updateMachine);

export default router;