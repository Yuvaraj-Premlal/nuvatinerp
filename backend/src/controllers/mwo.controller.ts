import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getMWOs = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { status, furnace_id } = req.query;
    const where: any = { tenant_id };
    if (status) where.status = String(status);
    if (furnace_id) where.furnace_id = String(furnace_id);
    const mwos = await prisma.meltWorkOrder.findMany({
      where,
      include: {
        furnace: { select: { machine_code: true, machine_name: true } },
        alloy_spec: { include: { item: { select: { id: true, item_name: true, item_code: true } } } },
        material_issues: { select: { id: true, issued_qty: true, batch_number: true, location: true } },
        melt_records: { select: { id: true, melt_lot_number: true, status: true } }
      },
      orderBy: { planned_date: 'desc' },
      take: 100
    });
    res.json({ success: true, data: mwos });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const getMWO = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { id } = req.params as { id: string };
    const mwo = await prisma.meltWorkOrder.findFirst({
      where: { id, tenant_id },
      include: {
        furnace: true,
        alloy_spec: { include: { item: true } },
        material_issues: { include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true } } } },
        melt_records: true
      }
    });
    res.json({ success: true, data: mwo });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createMWO = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const count = await prisma.meltWorkOrder.count({ where: { tenant_id } });
    const mwo_number = `MW-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const mwo = await prisma.meltWorkOrder.create({
      data: {
        tenant_id, mwo_number, ...req.body,
        planned_charge_weight: parseFloat(req.body.planned_charge_weight),
        planned_fresh_ingot: req.body.planned_fresh_ingot ? parseFloat(req.body.planned_fresh_ingot) : null,
        planned_return_scrap: req.body.planned_return_scrap ? parseFloat(req.body.planned_return_scrap) : null,
        planned_date: new Date(req.body.planned_date)
      },
      include: {
        furnace: { select: { machine_code: true, machine_name: true } },
        alloy_spec: { include: { item: { select: { item_name: true, item_code: true } } } }
      }
    });
    res.status(201).json({ success: true, data: mwo });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const updateMWOStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status, released_by } = req.body;
    const mwo = await prisma.meltWorkOrder.update({
      where: { id },
      data: { status, ...(status === 'released' ? { released_by, released_at: new Date() } : {}) }
    });
    res.json({ success: true, data: mwo });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const getMWOIssuedMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { id } = req.params as { id: string };
    const issues = await prisma.materialIssue.findMany({
      where: { tenant_id, mwo_id: id, melt_id: null },
      include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true } } }
    });
    res.json({ success: true, data: issues });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
