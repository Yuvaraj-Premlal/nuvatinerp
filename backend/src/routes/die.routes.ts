import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { createDie, getDies, getDieById, updateDie, toggleDieStatus } from '../controllers/die.controller';

const router = Router();
router.get('/', authenticate, getDies);
router.get('/:id', authenticate, getDieById);
router.post('/', authenticate, createDie);
router.put('/:id', authenticate, updateDie);
router.patch('/:id/status', authenticate, toggleDieStatus);
export default router;
