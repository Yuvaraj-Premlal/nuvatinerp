import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createGRN = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { grn_number, po_id, supplier_id, received_by, vehicle_number, supplier_dc_number, lines } = req.body;
    const grn = await prisma.grnHeader.create({
      data: {
        tenant_id, grn_number, po_id, supplier_id, received_by, vehicle_number, supplier_dc_number,
        grn_lines: {
          create: lines.map((l: any) => ({
            tenant_id,
            item_id: l.item_id,
            quantity_received: l.quantity_received,
            accepted_qty: l.accepted_qty,
            rejected_qty: l.rejected_qty,
            rejection_reason: l.rejection_reason,
            batch_number: l.batch_number,
            lot_number: l.lot_number,
            unit_price: l.unit_price
          }))
        }
      },
      include: { grn_lines: true }
    });
    for (const line of lines) {
      await prisma.stockLedger.create({
        data: {
          tenant_id,
          item_id: line.item_id,
          transaction_type: 'receipt',
          quantity: line.accepted_qty || line.quantity_received,
          unit_cost: line.unit_price,
          reference_type: 'grn',
          reference_id: grn.id,
          batch_number: line.batch_number,
          lot_number: line.lot_number
        }
      });
    }
    // Auto-update PO status to received if all lines fully received
    if (po_id) {
      const po = await prisma.purchaseOrder.findFirst({ where: { id: po_id, tenant_id }, include: { po_lines: true } });
      if (po) {
        const allReceived = po.po_lines.every((pol: any) => {
          const grnLine = lines.find((l: any) => l.item_id === pol.item_id);
          return grnLine && parseFloat(grnLine.quantity_received) >= pol.quantity_ordered;
        });
        if (allReceived) {
          await prisma.purchaseOrder.updateMany({ where: { id: po_id, tenant_id }, data: { status: 'received' } });
        }
      }
    }
    res.status(201).json({ success: true, data: grn });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getGRNs = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const grns = await prisma.grnHeader.findMany({
      where: { tenant_id },
      include: { grn_lines: { include: { item: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: grns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};