import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getStockBalance = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const ledger = await prisma.stockLedger.groupBy({
      by: ['item_id'],
      where: { tenant_id },
      _sum: { quantity: true }
    });
    const items = await prisma.itemMaster.findMany({
      where: { tenant_id, is_active: true },
      include: { pfep_detail: true }
    });
    const balance = items.map((item: any) => {
      const ledgerEntry = ledger.find((l: any) => l.item_id === item.id);
      const qty = ledgerEntry?._sum?.quantity || 0;
      const reorder = item.pfep_detail?.reorder_point || 0;
      return {
        item_id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        item_type: item.item_type,
        unit_of_measure: item.unit_of_measure,
        quantity_on_hand: qty,
        reorder_point: reorder,
        safety_stock: item.pfep_detail?.safety_stock || 0,
        below_reorder: qty <= reorder,
        storage_location: item.pfep_detail?.storage_location
      };
    });
    res.json({ success: true, data: balance });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getStockBalanceByItem = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const item_id = req.params.item_id as string;
    const ledger = await prisma.stockLedger.findMany({
      where: { tenant_id, item_id },
      orderBy: { transacted_at: 'desc' }
    });
    const total = ledger.reduce((sum: number, l: any) => sum + l.quantity, 0);
    res.json({ success: true, data: { quantity_on_hand: total, movements: ledger } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};