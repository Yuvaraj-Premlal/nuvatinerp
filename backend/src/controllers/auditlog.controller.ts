import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getEntityHistory = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { entity_type, entity_id } = req.params as { entity_type: string; entity_id: string };
    const logs = await prisma.auditLog.findMany({
      where: { tenant_id, entity_type, entity_id },
      orderBy: { changed_at: 'desc' },
      take: 50
    });
    res.json({ success: true, data: logs });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
