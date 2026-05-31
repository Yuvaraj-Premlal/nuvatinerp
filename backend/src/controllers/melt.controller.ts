import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ── Furnaces (MachineMaster where type=furnace) ───────────
export const getFurnaces = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const furnaces = await prisma.machineMaster.findMany({
      where: { tenant_id, machine_type: 'furnace', },
      orderBy: { machine_code: 'asc' }
    });
    res.json({ success: true, data: furnaces });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createFurnace = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { furnace_number, furnace_name, furnace_type, fuel_type, capacity_kg, lining_material, lining_life_kg } = req.body;
    const furnace = await prisma.machineMaster.create({
      data: {
        tenant_id,
        machine_code: furnace_number,
        machine_name: furnace_name,
        machine_type: 'furnace',
        fuel_type,
        capacity_kg: capacity_kg ? parseFloat(capacity_kg) : null,
        lining_material,
        lining_life_kg: lining_life_kg ? parseFloat(lining_life_kg) : null
      }
    });
    res.json({ success: true, data: furnace });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const updateFurnace = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const furnace = await prisma.machineMaster.update({ where: { id }, data: req.body });
    res.json({ success: true, data: furnace });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

// ── Alloy Specs (ItemAlloySpec linked to ItemMaster) ──────
export const getAlloySpecs = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const specs = await prisma.itemAlloySpec.findMany({
      where: { item: { tenant_id } },
      include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true } } },
      orderBy: { item: { item_code: 'asc' } }
    });
    res.json({ success: true, data: specs });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createAlloySpec = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { item_id, ...data } = req.body;
    const existing = await prisma.itemAlloySpec.findFirst({ where: { item_id, tenant_id } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'This item already has an alloy spec. Edit the existing spec instead.' });
    }
    const spec = await prisma.itemAlloySpec.create({ data: { tenant_id, item_id, ...data } });
    res.json({ success: true, data: spec });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const updateAlloySpec = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { reason, ...updateData } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required' });
    const existing = await prisma.itemAlloySpec.findUnique({ where: { id }, include: { item: { select: { item_code: true, tenant_id: true } } } });
    const spec = await prisma.itemAlloySpec.update({ where: { id }, data: updateData });
    const { logChange } = await import('../utils/audit');
    await logChange(existing?.item?.tenant_id || existing?.tenant_id || '', 'alloy_spec', id, existing?.item?.item_code || '', 'update', existing, spec, req.user?.user_id || '', req.user?.email || '', reason);
    res.json({ success: true, data: spec });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

// ── Melt Charge Record ────────────────────────────────────
export const getMeltRecords = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { status, furnace_id, from_date, to_date } = req.query;
    const where: any = { tenant_id };
    if (status) where.status = String(status);
    if (furnace_id) where.furnace_id = String(furnace_id);
    if (from_date || to_date) {
      where.charge_date = {};
      if (from_date) where.charge_date.gte = new Date(String(from_date));
      if (to_date) where.charge_date.lte = new Date(String(to_date) + 'T23:59:59.999Z');
    }
    const records = await prisma.meltChargeRecord.findMany({
      where,
      include: {
        furnace: { select: { machine_code: true, machine_name: true } },
        alloy_spec: { include: { item: { select: { item_name: true, item_code: true } } } },
        charge_lines: { include: { item: { select: { item_name: true, item_code: true } } } },
        return_scrap_lines: true,
        temp_readings: { orderBy: { recorded_at: 'asc' } },
        chemistry_readings: { orderBy: { recorded_at: 'asc' } }
      },
      orderBy: { charge_date: 'desc' },
      take: 100
    });
    res.json({ success: true, data: records });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const getMeltRecord = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { id } = req.params as { id: string };
    const record = await prisma.meltChargeRecord.findFirst({
      where: { id, tenant_id },
      include: {
        furnace: true,
        alloy_spec: { include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true } } } },
        charge_lines: { include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true } } } },
        return_scrap_lines: true,
        temp_readings: { orderBy: { recorded_at: 'asc' } },
        chemistry_readings: { orderBy: { sample_number: 'asc' } },
        shot_links: true
      }
    });
    res.json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createMeltRecord = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { charge_lines, return_scrap_lines, ...data } = req.body;

    const count = await prisma.meltChargeRecord.count({ where: { tenant_id } });
    const melt_lot_number = `ML-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const fresh = parseFloat(data.fresh_ingot_weight || 0);
    const scrap = (return_scrap_lines || []).reduce((s: number, l: any) => s + parseFloat(l.weight_kg || 0), 0);
    const total_charge_weight = fresh + scrap;

    const record = await prisma.meltChargeRecord.create({
      data: {
        tenant_id,
        melt_lot_number,
        ...data,
        fresh_ingot_weight: fresh,
        return_scrap_weight: scrap,
        total_charge_weight,
        charge_lines: charge_lines?.length > 0 ? {
          create: charge_lines.map((l: any, i: number) => ({
            tenant_id,
            item_id: l.item_id,
            batch_number: l.batch_number || null,
            grn_id: l.grn_id || null,
            weight_charged: parseFloat(l.weight_charged),
            uom: l.uom || 'KG',
            sequence: i + 1
          }))
        } : undefined,
        return_scrap_lines: return_scrap_lines?.length > 0 ? {
          create: return_scrap_lines.map((l: any) => ({
            tenant_id,
            scrap_type: l.scrap_type,
            alloy_grade: l.alloy_grade || null,
            weight_kg: parseFloat(l.weight_kg),
            source_job_id: l.source_job_id || null,
            notes: l.notes || null
          }))
        } : undefined
      },
      include: {
        furnace: true,
        alloy_spec: { include: { item: true } },
        charge_lines: { include: { item: true } },
        return_scrap_lines: true
      }
    });

    // Update MWO status to in_progress
    if (data.mwo_id) {
      await prisma.meltWorkOrder.update({
        where: { id: data.mwo_id },
        data: { status: 'in_progress' }
      });
    }
    // Update furnace total_kg_melted
    await prisma.machineMaster.update({
      where: { id: data.furnace_id },
      data: { total_kg_melted: { increment: total_charge_weight } }
    });

    res.status(201).json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const updateMeltStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status, ...data } = req.body;

    let yield_percent = undefined;
    if (status === 'transferred' && data.metal_transferred_kg && data.total_charge_weight) {
      yield_percent = (parseFloat(data.metal_transferred_kg) / parseFloat(data.total_charge_weight)) * 100;
    }

    // Get total_charge_weight from existing record if not passed
    if (status === 'transferred' && data.metal_transferred_kg && !data.total_charge_weight) {
      const existing = await prisma.meltChargeRecord.findUnique({ where: { id }, select: { total_charge_weight: true } });
      if (existing?.total_charge_weight) {
        yield_percent = (parseFloat(data.metal_transferred_kg) / existing.total_charge_weight) * 100;
      }
    }

    const record = await prisma.meltChargeRecord.update({
      where: { id },
      data: { status, ...data, ...(yield_percent !== undefined ? { yield_percent } : {}) }
    });
    // Auto-update MWO to completed when melt transferred
    if (status === 'transferred' && record.mwo_id) {
      await prisma.meltWorkOrder.update({
        where: { id: record.mwo_id },
        data: { status: 'completed' }
      });
    }
    res.json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const addTemperatureLog = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { id } = req.params as { id: string };

    const melt = await prisma.meltChargeRecord.findUnique({
      where: { id },
      include: { alloy_spec: true }
    });
    const temp = parseFloat(req.body.temperature);
    const stage = req.body.stage;
    let is_out_of_spec = false;
    if (melt?.alloy_spec) {
      const g = melt.alloy_spec as any;
      if (stage === 'melt_complete' && g.melt_temp_min && g.melt_temp_max) {
        is_out_of_spec = temp < g.melt_temp_min || temp > g.melt_temp_max;
      }
      if (stage === 'transfer' && g.transfer_temp_min && g.transfer_temp_max) {
        is_out_of_spec = temp < g.transfer_temp_min || temp > g.transfer_temp_max;
      }
    }

    const log = await prisma.meltTemperatureLog.create({
      data: { tenant_id, melt_id: id, ...req.body, temperature: temp, is_out_of_spec }
    });
    res.json({ success: true, data: log, is_out_of_spec });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const addChemistryLog = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { id } = req.params as { id: string };

    const melt = await prisma.meltChargeRecord.findUnique({
      where: { id }, include: { alloy_spec: true }
    });
    const g = melt?.alloy_spec as any;
    let status = 'pass';
    if (g) {
      const b = req.body;
      if ((g.si_min && b.si < g.si_min) || (g.si_max && b.si > g.si_max)) status = 'fail';
      if ((g.cu_min && b.cu < g.cu_min) || (g.cu_max && b.cu > g.cu_max)) status = 'fail';
      if (g.fe_max && b.fe > g.fe_max) status = 'fail';
      if (g.zn_max && b.zn > g.zn_max) status = 'fail';
    }

    const log = await prisma.meltChemistryLog.create({
      data: { tenant_id, melt_id: id, ...req.body, status }
    });

    await prisma.meltChargeRecord.update({
      where: { id },
      data: { chemistry_checked: true, chemistry_status: status }
    });

    res.json({ success: true, data: log, status });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const toggleAlloySpecStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required' });
    const existing = await prisma.itemAlloySpec.findUnique({ where: { id }, include: { item: { select: { item_code: true } } } });
    const updated = await prisma.itemAlloySpec.update({ where: { id }, data: { is_active: !existing?.is_active } });
    const { logChange } = await import('../utils/audit');
    await logChange(existing?.tenant_id || '', 'alloy_spec', id, existing?.item?.item_code || '', existing?.is_active ? 'deactivate' : 'activate', existing, updated, req.user?.user_id || '', req.user?.email || '', reason);
    res.json({ success: true, data: updated });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
