import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createMachine = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { machine_name } = req.body;
    const _dup = await (prisma as any).machineMaster.findFirst({ where: { tenant_id, machine_name: { equals: machine_name, mode: 'insensitive' } } });
    if (_dup) return res.status(400).json({ success: false, error: `Machine "${req.body.machine_name}" already exists as ${_dup.machine_code}` });
    const { machine_code, machine_name: _mn, machine_type, capacity_tons, rated_cycle_time_sec, rated_shots_per_shift, is_constraint, oee_target_percent, location } = req.body;
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
      where: { tenant_id, }
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
export const toggleMachineStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required' });
    const existing = await (prisma as any).machineMaster.findUnique({ where: { id } });
    const updated = await (prisma as any).machineMaster.update({ where: { id }, data: { is_active: !existing?.is_active } });
    const { logChange } = await import('../utils/audit');
    await logChange(existing?.tenant_id || '', 'machine', id, existing?.machine_code || '', existing?.is_active ? 'deactivate' : 'activate', existing, updated, req.user?.user_id || '', req.user?.email || '', reason);
    res.json({ success: true, data: updated });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
