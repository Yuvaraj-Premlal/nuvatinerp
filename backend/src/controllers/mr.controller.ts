import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getMRs = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { status, dept } = req.query;
    const where: any = { tenant_id };
    if (status) where.status = String(status);
    if (dept) where.raised_by_dept = String(dept);
    const mrs = await prisma.materialRequisition.findMany({
      where,
      include: {
        mwo: { select: { mwo_number: true, furnace: { select: { machine_code: true } } } },
        lines: { include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true } } } }
      },
      orderBy: { created_at: 'desc' },
      take: 100
    });
    res.json({ success: true, data: mrs });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createMR = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { lines, ...data } = req.body;
    const count = await prisma.materialRequisition.count({ where: { tenant_id } });
    const mr_number = `MR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const mr = await prisma.materialRequisition.create({
      data: {
        tenant_id, mr_number, ...data,
        required_by_date: new Date(data.required_by_date),
        lines: {
          create: lines.map((l: any) => ({
            tenant_id,
            item_id: l.item_id,
            quantity_required: parseFloat(l.quantity_required),
            unit_of_measure: l.unit_of_measure,
            notes: l.notes || null
          }))
        }
      },
      include: {
        lines: { include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true } } } },
        mwo: { select: { mwo_number: true } }
      }
    });
    res.status(201).json({ success: true, data: mr });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const updateMRStatus = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { id } = req.params as { id: string };
    const { status, acknowledged_by, cancelled_by, cancellation_reason } = req.body;
    const mr = await prisma.materialRequisition.update({
      where: { id },
      data: {
        status,
        ...(status === 'acknowledged' ? { acknowledged_by, acknowledged_at: new Date() } : {}),
        ...(status === 'fulfilled' ? { fulfilled_at: new Date() } : {}),
        ...(status === 'cancelled' ? { cancelled_by, cancelled_at: new Date(), cancellation_reason } : {})
      }
    });
    // Create system alert when MR submitted
    if (status === 'submitted') {
      const mrFull = await prisma.materialRequisition.findUnique({ where: { id }, include: { lines: { include: { item: true } } } });
      await prisma.systemAlert.create({
        data: {
          tenant_id,
          alert_type: 'material_requisition',
          severity: req.body.priority === 'critical' ? 'critical' : req.body.priority === 'urgent' ? 'high' : 'info',
          message: `MR ${mrFull?.mr_number} submitted by ${mrFull?.raised_by_dept} — ${mrFull?.lines?.length} item(s) required by ${mrFull?.required_by_date?.toLocaleDateString('en-IN')}`,
          reference_type: 'material_requisition',
          reference_id: id
        }
      });
    }
    res.json({ success: true, data: mr });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const fulfillMRLine = async (req: AuthRequest, res: Response) => {
  try {
    const { line_id } = req.params as { line_id: string };
    const { quantity_fulfilled } = req.body;
    const line = await prisma.materialRequisitionLine.update({
      where: { id: line_id },
      data: {
        quantity_fulfilled: { increment: parseFloat(quantity_fulfilled) },
        status: 'fulfilled'
      }
    });
    // Check if all lines fulfilled — update MR status
    const mr = await prisma.materialRequisition.findUnique({
      where: { id: line.mr_id },
      include: { lines: true }
    });
    if (mr) {
      const allFulfilled = mr.lines.every((l: any) => l.status === 'fulfilled');
      const anyFulfilled = mr.lines.some((l: any) => l.quantity_fulfilled > 0);
      await prisma.materialRequisition.update({
        where: { id: line.mr_id },
        data: { status: allFulfilled ? 'fulfilled' : anyFulfilled ? 'partially_fulfilled' : mr.status }
      });
    }
    res.json({ success: true, data: line });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const escalateToPR = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { id } = req.params as { id: string };
    const { lines, raised_by, required_by_date, notes } = req.body;
    const count = await prisma.purchaseRequisition.count({ where: { tenant_id } });
    const pr_number = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const pr = await prisma.purchaseRequisition.create({
      data: {
        tenant_id, pr_number, raised_by,
        required_by_date: new Date(required_by_date),
        notes,
        lines: {
          create: lines.map((l: any) => ({
            tenant_id,
            mr_line_id: l.mr_line_id || null,
            item_id: l.item_id,
            quantity_required: parseFloat(l.quantity_required),
            unit_of_measure: l.unit_of_measure,
            preferred_supplier_id: l.preferred_supplier_id || null,
            notes: l.notes || null
          }))
        }
      },
      include: { lines: { include: { item: { select: { item_name: true, item_code: true } } } } }
    });
    // Alert Purchase team
    await prisma.systemAlert.create({
      data: {
        tenant_id,
        alert_type: 'purchase_requisition',
        severity: 'high',
        message: `PR ${pr_number} raised by Stores — ${lines.length} item(s) needed. Please raise PO.`,
        reference_type: 'purchase_requisition',
        reference_id: pr.id
      }
    });
    res.status(201).json({ success: true, data: pr });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const getPRs = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { status } = req.query;
    const where: any = { tenant_id };
    if (status) where.status = String(status);
    const prs = await prisma.purchaseRequisition.findMany({
      where,
      include: {
        lines: {
          include: {
            item: { select: { item_name: true, item_code: true, unit_of_measure: true } },
            mr_line: { include: { mr: { select: { mr_number: true, raised_by_dept: true } } } }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: prs });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const getAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const alerts = await prisma.systemAlert.findMany({
      where: { tenant_id, is_resolved: false },
      orderBy: { created_at: 'desc' },
      take: 50
    });
    res.json({ success: true, data: alerts });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const markAlertRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const alert = await prisma.systemAlert.update({
      where: { id },
      data: { is_read: true }
    });
    res.json({ success: true, data: alert });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const resolveAlert = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { resolved_by } = req.body;
    const alert = await prisma.systemAlert.update({
      where: { id },
      data: { is_resolved: true, resolved_at: new Date(), resolved_by }
    });
    res.json({ success: true, data: alert });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
