import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createPO = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const count = await prisma.purchaseOrder.count({ where: { tenant_id } });
    const po_number = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const { lines, ...header } = req.body;

    const po = await prisma.purchaseOrder.create({
      data: {
        tenant_id,
        po_number,
        revision_number: 0,
        is_latest_revision: true,
        status: 'draft',
        po_date: new Date(),
        ...header,
        expected_delivery_date: header.expected_delivery_date ? new Date(header.expected_delivery_date) : null,
        po_lines: {
          create: lines.map((l: any) => ({
            tenant_id,
            item_id: l.item_id,
            quantity_ordered: l.quantity_ordered,
            unit_price: l.unit_price,
            quantity_received: 0
          }))
        }
      },
      include: { po_lines: { include: { item: true } }, supplier: true }
    });

    res.status(201).json({ success: true, data: po });
  } catch (error: any) {
    console.error('createPO error:', JSON.stringify(error, null, 2));
    res.status(500).json({ success: false, error: error.message, detail: error.meta || error.code });
  }
};

export const getPOs = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const pos = await prisma.purchaseOrder.findMany({
      where: { tenant_id, is_latest_revision: true },
      include: { po_lines: { include: { item: true } }, supplier: true },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: pos });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPOById = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = String(req.params.id);
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, tenant_id },
      include: {
        po_lines: { include: { item: true } },
        supplier: true
      }
    });
    if (!po) return res.status(404).json({ success: false, error: 'PO not found' });

    const amendments = await prisma.pOAmendmentLog.findMany({
      where: { tenant_id, po_number: po.po_number },
      orderBy: { amended_at: 'desc' }
    });

    res.json({ success: true, data: { ...po, amendments } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePOStatus = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = String(req.params.id);
    const { status } = req.body;
    await prisma.purchaseOrder.updateMany({
      where: { id, tenant_id },
      data: { status }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const cancelPO = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = String(req.params.id);
    const { reason, cancelled_by } = req.body;

    const po = await prisma.purchaseOrder.findFirst({ where: { id, tenant_id } });
    if (!po) return res.status(404).json({ success: false, error: 'PO not found' });

    if (po.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'PO already cancelled' });
    }

    const hasGRN = await prisma.grnHeader.findFirst({ where: { po_id: id, tenant_id } });
    if (hasGRN) {
      return res.status(400).json({ success: false, error: 'Cannot cancel — GRN already raised against this PO' });
    }

    await prisma.purchaseOrder.updateMany({
      where: { id, tenant_id },
      data: {
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date(),
        cancelled_by: cancelled_by || 'system'
      }
    });

    await prisma.systemAlert.create({
      data: {
        tenant_id,
        alert_type: 'po_cancelled',
        severity: 'info',
        message: `PO ${po.po_number} cancelled. Reason: ${reason}`,
        reference_type: 'purchase_order',
        reference_id: id
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const amendPO = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = String(req.params.id);
    const { amendment_reason, amended_by, lines, expected_delivery_date, notes } = req.body;

    const originalPO = await prisma.purchaseOrder.findFirst({
      where: { id, tenant_id },
      include: { po_lines: true }
    });

    if (!originalPO) return res.status(404).json({ success: false, error: 'PO not found' });
    if (originalPO.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Cannot amend a cancelled PO' });
    }

    const hasGRN = await prisma.grnHeader.findFirst({ where: { po_id: id, tenant_id } });
    if (hasGRN) {
      return res.status(400).json({ success: false, error: 'Cannot amend — GRN already raised. Raise a new PO instead.' });
    }

    const newRevision = originalPO.revision_number + 1;

    await prisma.purchaseOrder.updateMany({
      where: { id, tenant_id },
      data: { is_latest_revision: false }
    });

    const newPO = await prisma.purchaseOrder.create({
      data: {
        tenant_id,
        po_number: originalPO.po_number,
        revision_number: newRevision,
        is_latest_revision: true,
        parent_po_id: id,
        status: originalPO.status,
        supplier_id: originalPO.supplier_id,
        po_date: originalPO.po_date,
        expected_delivery_date: expected_delivery_date ? new Date(expected_delivery_date) : originalPO.expected_delivery_date,
        raised_by: originalPO.raised_by,
        notes: notes || originalPO.notes,
        amendment_reason,
        po_lines: {
          create: lines.map((l: any) => ({
            tenant_id,
            item_id: l.item_id,
            quantity_ordered: l.quantity_ordered,
            unit_price: l.unit_price,
            quantity_received: 0
          }))
        }
      },
      include: { po_lines: { include: { item: true } }, supplier: true }
    });

    const changesSummary = `Qty/Price updated. Rev ${originalPO.revision_number} → Rev ${newRevision}`;

    await prisma.pOAmendmentLog.create({
      data: {
        tenant_id,
        po_id: newPO.id,
        po_number: originalPO.po_number,
        revision_from: originalPO.revision_number,
        revision_to: newRevision,
        amended_by: amended_by || 'system',
        amendment_reason,
        changes_summary: changesSummary
      }
    });

    res.status(201).json({ success: true, data: newPO });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPORevisions = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = String(req.params.id);

    const po = await prisma.purchaseOrder.findFirst({ where: { id, tenant_id } });
    if (!po) return res.status(404).json({ success: false, error: 'PO not found' });

    const allRevisions = await prisma.purchaseOrder.findMany({
      where: { tenant_id, po_number: po.po_number },
      include: { po_lines: { include: { item: true } } },
      orderBy: { revision_number: 'desc' }
    });

    res.json({ success: true, data: allRevisions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
