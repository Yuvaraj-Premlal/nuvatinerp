import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { createPO, getPOs, getPOById, updatePOStatus, cancelPO, amendPO, getPORevisions } from '../controllers/purchase.controller';

const router = Router();

router.post('/', authenticate, createPO);
router.get('/', authenticate, getPOs);
router.get('/:id/revisions', authenticate, getPORevisions);
router.get('/:id', authenticate, getPOById);
router.put('/:id', authenticate, updatePOStatus);
router.put('/:id/approve', authenticate, async (req: any, res: any) => {
  req.body = { status: 'approved' };
  return updatePOStatus(req, res);
});
router.put('/:id/send', authenticate, async (req: any, res: any) => {
  req.body = { status: 'sent' };
  return updatePOStatus(req, res);
});
router.post('/:id/cancel', authenticate, cancelPO);
router.post('/:id/amend', authenticate, amendPO);

export default router;
