import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createSalesOrder = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { so_number, customer_name, customer_id, delivery_date, lines } = req.body;
    const so = await prisma.salesOrder.create({
      data: {
        tenant_id, so_number, customer_name, customer_id, delivery_date,
        so_lines: {
          create: lines.map((l: any) => ({
            tenant_id,
            item_id: l.item_id,
            quantity_ordered: l.quantity_ordered,
            unit_price: l.unit_price,
            uom: l.uom
          }))
        }
      },
      include: { so_lines: true }
    });
    res.status(201).json({ success: true, data: so });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSalesOrders = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const orders = await prisma.salesOrder.findMany({
      where: { tenant_id },
      include: { so_lines: { include: { item: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createDispatch = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { dispatch_number, so_id, dispatched_by, vehicle_number, transporter, challan_number, lines } = req.body;
    const dispatch = await prisma.dispatchHeader.create({
      data: {
        tenant_id, dispatch_number, so_id, dispatched_by, vehicle_number, transporter, challan_number, status: 'confirmed',
        dispatch_lines: {
          create: lines.map((l: any) => ({
            tenant_id,
            item_id: l.item_id,
            so_line_id: l.so_line_id,
            quantity_dispatched: l.quantity_dispatched,
            batch_number: l.batch_number,
            pack_count: l.pack_count,
            pieces_per_pack: l.pieces_per_pack
          }))
        }
      },
      include: { dispatch_lines: true }
    });
    for (const line of lines) {
      await prisma.stockLedger.create({
        data: {
          tenant_id,
          item_id: line.item_id,
          transaction_type: 'dispatch',
          quantity: -line.quantity_dispatched,
          reference_type: 'dispatch',
          reference_id: dispatch.id
        }
      });
    }
    res.status(201).json({ success: true, data: dispatch });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getDispatches = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const dispatches = await prisma.dispatchHeader.findMany({
      where: { tenant_id },
      include: { dispatch_lines: { include: { item: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: dispatches });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
export const getDispatchById = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = String(req.params.id);
    const dispatch = await prisma.dispatchHeader.findFirst({
      where: { id, tenant_id },
      include: {
        dispatch_lines: {
          include: { item: true }
        }
      }
    });
    if (!dispatch) return res.status(404).json({ success: false, error: 'Dispatch not found' });
    res.json({ success: true, data: dispatch });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSalesOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = String(req.params.id);
    const so = await prisma.salesOrder.findFirst({
      where: { id, tenant_id },
      include: { so_lines: true }
    });
    if (!so) return res.status(404).json({ success: false, error: 'Sales order not found' });
    res.json({ success: true, data: so });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
