import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { Response } from 'express';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const alerts = await prisma.systemAlert.findMany({
      where: { tenant_id },
      orderBy: { created_at: 'desc' },
      take: 50
    });
    res.json({ success: true, data: alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id as string;
    await prisma.systemAlert.updateMany({
      where: { id, tenant_id },
      data: { is_read: true }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/resolve', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id as string;
    await prisma.systemAlert.updateMany({
      where: { id, tenant_id },
      data: { is_resolved: true, resolved_at: new Date() }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
