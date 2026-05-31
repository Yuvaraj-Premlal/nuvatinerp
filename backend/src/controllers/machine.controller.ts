import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const generateMachineCode = async (tenant_id: string, machine_type: string, capacity_tons?: number): Promise<string> => {
  const typePrefix: Record<string, string> = {
    furnace: 'FURN', die_casting: 'DC', cnc: 'CNC', lathe: 'LATHE', other: 'MACH'
  };
  const prefix = typePrefix[machine_type] || 'MACH';
  const cap = capacity_tons ? `-${capacity_tons}` : '';
  const pattern = `${prefix}${cap}-`;
  const existing = await (prisma as any).machineMaster.findMany({ where: { tenant_id, machine_code: { startsWith: pattern } } });
  const seq = String(existing.length + 1).padStart(3, '0');
  return `${pattern}${seq}`;
};

export const createMachine = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { machine_name } = req.body;
    const _dup = await (prisma as any).machineMaster.findFirst({ where: { tenant_id, machine_name: { equals: machine_name, mode: 'insensitive' } } });
    if (_dup) return res.status(400).json({ success: false, error: `Machine "${req.body.machine_name}" already exists as ${_dup.machine_code}` });
    const { machine_name: _mn, machine_type, capacity_tons, rated_cycle_time_sec, rated_shots_per_shift, is_constraint, oee_target_percent, location, cost_per_hour, power_kw } = req.body;
    const machine_code = await generateMachineCode(tenant_id, machine_type, capacity_tons ? parseFloat(capacity_tons) : undefined);
    const machine = await prisma.machineMaster.create({
      data: { tenant_id, machine_code, machine_name, machine_type,
        capacity_tons: capacity_tons ? parseFloat(capacity_tons) : null,
        rated_cycle_time_sec: rated_cycle_time_sec ? parseInt(rated_cycle_time_sec) : null,
        rated_shots_per_shift: rated_shots_per_shift ? parseInt(rated_shots_per_shift) : null,
        is_constraint: is_constraint || false,
        oee_target_percent: oee_target_percent ? parseFloat(oee_target_percent) : null,
        power_kw: power_kw ? parseFloat(power_kw) : null,
        cost_per_hour: cost_per_hour ? parseFloat(cost_per_hour) : null,
        location: location || null
      }
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
    const { id } = req.params as { id: string };
    const { reason, ...updateData } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required' });
    const existing = await prisma.machineMaster.findUnique({ where: { id } });
    const machine = await prisma.machineMaster.update({ where: { id }, data: updateData });
    const { logChange } = await import('../utils/audit');
    await logChange(existing?.tenant_id || '', 'machine', id, existing?.machine_code || '', 'update', existing, machine, req.user?.user_id || '', req.user?.email || '', reason);
    res.json({ success: true, data: machine });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
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
