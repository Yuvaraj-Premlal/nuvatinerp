import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getCostCentres = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const ccs = await prisma.costCentre.findMany({
      where: { tenant_id, is_active: true },
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
    const cc = await prisma.costCentre.update({ where: { id }, data: req.body });
    res.json({ success: true, data: cc });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
