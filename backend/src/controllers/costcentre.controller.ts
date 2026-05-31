import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getCostCentres = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const ccs = await prisma.costCentre.findMany({
      where: { tenant_id, },
      include: { machine: { select: { machine_code: true, machine_name: true } } },
      orderBy: { code: 'asc' }
    });
    res.json({ success: true, data: ccs });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createCostCentre = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { name, type, ...rest } = req.body;
    const count = await prisma.costCentre.count({ where: { tenant_id } });
    const prefix = type === 'machine' ? 'CC-MACH' : type === 'department' ? 'CC-DEPT' : type === 'project' ? 'CC-PROJ' : 'CC-OVH';
    const code = `${prefix}-${String(count + 1).padStart(4, '0')}`;
    const cc = await prisma.costCentre.create({
      data: { tenant_id, code, name, type, ...rest, machine_id: rest.machine_id || null }
    });
    res.status(201).json({ success: true, data: cc });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const updateCostCentre = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { reason, ...updateData } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required' });
    const existing = await (prisma as any).costCentre.findUnique({ where: { id } });
    const cc = await (prisma as any).costCentre.update({ where: { id }, data: updateData });
    const { logChange } = await import('../utils/audit');
    await logChange(existing?.tenant_id || '', 'cost_centre', id, existing?.code || '', 'update', existing, cc, req.user?.user_id || '', req.user?.email || '', reason);
    res.json({ success: true, data: cc });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const toggleCostcentreStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required' });
    const existing = await (prisma as any).costCentre.findUnique({ where: { id } });
    const updated = await (prisma as any).costCentre.update({ where: { id }, data: { is_active: !existing?.is_active } });
    const { logChange } = await import('../utils/audit');
    await logChange(existing?.tenant_id || '', 'costcentre', id, existing?.code || '', existing?.is_active ? 'deactivate' : 'activate', existing, updated, req.user?.user_id || '', req.user?.email || '', reason);
    res.json({ success: true, data: updated });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
