import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createPO = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { po_number, supplier_id, expected_delivery_date, notes, lines } = req.body;
    const po = await prisma.purchaseOrder.create({
      data: {
        tenant_id, po_number, supplier_id, expected_delivery_date, notes,
        po_lines: {
          create: lines.map((l: any) => ({
            tenant_id,
            item_id: l.item_id,
            quantity_ordered: l.quantity_ordered,
            unit_price: l.unit_price,
            uom: l.uom
          }))
        }
      },
      include: { po_lines: true, supplier: true }
    });
    res.status(201).json({ success: true, data: po });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPOs = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const pos = await prisma.purchaseOrder.findMany({
      where: { tenant_id },
      include: { supplier: true, po_lines: { include: { item: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: pos });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePOStatus = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id as string;
    const { status } = req.body;
    const po = await prisma.purchaseOrder.updateMany({
      where: { id, tenant_id },
      data: { status }
    });
    res.json({ success: true, data: po });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};