import { Router } from 'express';
import { createUser, getUsers } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createUser);
router.get('/:tenant_id', authenticate, getUsers);

export default router;
