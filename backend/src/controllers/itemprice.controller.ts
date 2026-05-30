import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getPriceHistory = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { item_id } = req.params as { item_id: string };
    const history = await prisma.itemPriceHistory.findMany({
      where: { tenant_id, item_id },
      include: { supplier: { select: { supplier_name: true, supplier_code: true } } },
      orderBy: { effective_date: 'desc' },
      take: 50
    });
    res.json({ success: true, data: history });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const getLastPrice = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { item_id } = req.params as { item_id: string };
    const { supplier_id } = req.query;
    const where: any = { tenant_id, item_id };
    if (supplier_id) where.supplier_id = String(supplier_id);
    const last = await prisma.itemPriceHistory.findFirst({
      where,
      include: { supplier: { select: { supplier_name: true, supplier_code: true } } },
      orderBy: { effective_date: 'desc' }
    });
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const avg = await prisma.itemPriceHistory.aggregate({
      where: { tenant_id, item_id, effective_date: { gte: ninetyDaysAgo } },
      _avg: { price_per_uom: true },
      _count: true
    });
    res.json({
      success: true,
      data: {
        last_price: last?.price_per_uom || null,
        last_supplier: last?.supplier?.supplier_name || null,
        last_date: last?.effective_date || null,
        avg_90d: avg._avg.price_per_uom ? Math.round(avg._avg.price_per_uom * 100) / 100 : null,
        sample_count: avg._count
      }
    });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const addManualPrice = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { item_id } = req.params as { item_id: string };
    const record = await prisma.itemPriceHistory.create({
      data: { tenant_id, item_id, ...req.body, source: 'manual', effective_date: new Date() }
    });
    res.status(201).json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
