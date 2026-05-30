import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getDies = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const dies = await prisma.dieMaster.findMany({
      where: { tenant_id },

      orderBy: { die_number: 'asc' }
    });
    res.json({ success: true, data: dies });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createDie = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { die_name, item_id, ...rest } = req.body;
    const count = await prisma.dieMaster.count({ where: { tenant_id } });
    // Auto-generate die number: DIE-YYYY-NNNN
    const die_number = `DIE-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const die = await prisma.dieMaster.create({
      data: {
        tenant_id, die_number, die_name, item_id: item_id || null, ...rest,
        cavity_count: rest.cavity_count ? parseInt(rest.cavity_count) : 1,
        design_life_shots: rest.design_life_shots ? parseInt(rest.design_life_shots) : null,
        pm_interval_shots: rest.pm_interval_shots ? parseInt(rest.pm_interval_shots) : null,
      }
    });
    res.status(201).json({ success: true, data: die });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const getDieById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const die = await prisma.dieMaster.findUnique({ where: { id } });
    res.json({ success: true, data: die });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const updateDie = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const die = await prisma.dieMaster.update({ where: { id }, data: req.body });
    res.json({ success: true, data: die });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const toggleDieStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required' });
    const old = await (prisma as any).dieMaster.findUnique({ where: { id } });
    const updated = await (prisma as any).dieMaster.update({ where: { id }, data: { is_active: !old?.is_active } });
    res.json({ success: true, data: updated });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
