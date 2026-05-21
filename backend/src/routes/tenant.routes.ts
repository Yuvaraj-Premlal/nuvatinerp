import { Router } from 'express';
import { createTenant, getTenants, getTenantById } from '../controllers/tenant.controller';

const router = Router();

router.post('/', createTenant);
router.get('/', getTenants);
router.get('/:id', getTenantById);

export default router;
