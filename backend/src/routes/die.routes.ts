import { Router } from 'express';
import { createDie, getDies, getDieById, updateDieStatus } from '../controllers/die.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createDie);
router.get('/', authenticate, getDies);
router.get('/:id', authenticate, getDieById);
router.put('/:id', authenticate, updateDieStatus);

export default router;