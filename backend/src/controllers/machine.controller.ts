import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createMachine = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { machine_code, machine_name, machine_type, capacity_tons, rated_cycle_time_sec, rated_shots_per_shift, is_constraint, oee_target_percent, location } = req.body;
    const machine = await prisma.machineMaster.create({
      data: { tenant_id, machine_code, machine_name, machine_type, capacity_tons, rated_cycle_time_sec, rated_shots_per_shift, is_constraint, oee_target_percent, location }
    });
    res.status(201).json({ success: true, data: machine });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMachines = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const machines = await prisma.machineMaster.findMany({
      where: { tenant_id, is_active: true }
    });
    res.json({ success: true, data: machines });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateMachine = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id as string;
    const { is_constraint, oee_target_percent, rated_cycle_time_sec } = req.body;
    const machine = await prisma.machineMaster.updateMany({
      where: { id, tenant_id },
      data: { is_constraint, oee_target_percent, rated_cycle_time_sec }
    });
    res.json({ success: true, data: machine });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};