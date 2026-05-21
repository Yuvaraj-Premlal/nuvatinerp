import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createDie = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { die_number, die_name, item_id, cavity_count, design_life_shots, current_shot_count, pm_interval_shots, die_owner, customer_id, current_status, repair_vendor, repair_lead_time_days, machine_id, location } = req.body;
    const die = await prisma.dieMaster.create({
      data: { tenant_id, die_number, die_name, item_id, cavity_count, design_life_shots, current_shot_count, pm_interval_shots, die_owner, customer_id, current_status, repair_vendor, repair_lead_time_days, machine_id, location }
    });
    res.status(201).json({ success: true, data: die });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getDies = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const dies = await prisma.dieMaster.findMany({
      where: { tenant_id, is_active: true },
      include: { machine: true }
    });
    res.json({ success: true, data: dies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getDieById = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id as string;
    const die = await prisma.dieMaster.findFirst({
      where: { id, tenant_id },
      include: { machine: true, die_shot_logs: { orderBy: { logged_at: 'desc' }, take: 10 } }
    });
    res.json({ success: true, data: die });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateDieStatus = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id as string;
    const { current_status, current_shot_count, shots_at_last_pm } = req.body;
    const die = await prisma.dieMaster.updateMany({
      where: { id, tenant_id },
      data: { current_status, current_shot_count, shots_at_last_pm }
    });
    res.json({ success: true, data: die });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};