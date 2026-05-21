import { Router } from 'express';
import { createUser, getUsers } from '../controllers/user.controller';

const router = Router();

router.post('/', createUser);
router.get('/:tenant_id', getUsers);

export default router;
