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
export const getStockMovements = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { item_id, from_date, to_date, transaction_type } = req.query;

    const where: any = { tenant_id };
    if (item_id) where.item_id = String(item_id);
    if (transaction_type) where.transaction_type = String(transaction_type);
    if (from_date || to_date) {
      where.transacted_at = {};
      if (from_date) where.transacted_at.gte = new Date(String(from_date));
      if (to_date) where.transacted_at.lte = new Date(String(to_date) + 'T23:59:59.999Z');
    }

    const movements = await prisma.stockLedger.findMany({
      where,
      include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true } } },
      orderBy: { transacted_at: 'desc' },
      take: 200
    });

    // Resolve reference numbers
    const enriched = await Promise.all(movements.map(async (m: any) => {
      let reference_number = m.reference_id?.slice(0, 8) || '—';
      let reference_display = m.reference_type || '—';

      if (m.reference_type === 'grn' && m.reference_id) {
        const grn = await prisma.grnHeader.findFirst({ where: { id: m.reference_id }, select: { grn_number: true } });
        if (grn) reference_number = grn.grn_number;
        reference_display = 'GRN';
      } else if (m.reference_type === 'job_card' && m.reference_id) {
        const jc = await prisma.jobCard.findFirst({ where: { id: m.reference_id }, select: { job_number: true } });
        if (jc) reference_number = jc.job_number;
        reference_display = 'Job Card';
      } else if (m.reference_type === 'dispatch' && m.reference_id) {
        const d = await prisma.dispatchHeader.findFirst({ where: { id: m.reference_id }, select: { dispatch_number: true } });
        if (d) reference_number = d.dispatch_number;
        reference_display = 'Dispatch';
      } else if (m.reference_type === 'grn_reversal') {
        reference_display = 'GRN Reversal';
        reference_number = '—';
      }

      return {
        id: m.id,
        item_id: m.item_id,
        item_name: m.item?.item_name || '—',
        item_code: m.item?.item_code || '—',
        unit_of_measure: m.item?.unit_of_measure || '',
        transaction_type: m.transaction_type,
        quantity: m.quantity,
        unit_cost: m.unit_cost,
        reference_display,
        reference_number,
        reference_id: m.reference_id,
        batch_number: m.batch_number,
        lot_number: m.lot_number,
        transacted_at: m.transacted_at,
        transacted_by: m.transacted_by
      };
    }));

    // Calculate running balance per item if filtering by single item
    if (item_id) {
      const allMovements = await prisma.stockLedger.findMany({
        where: { tenant_id, item_id: String(item_id) },
        orderBy: { transacted_at: 'asc' }
      });
      let runningBalance = 0;
      const balanceMap: any = {};
      allMovements.forEach((m: any) => {
        runningBalance += m.quantity;
        balanceMap[m.id] = Math.round(runningBalance * 1000) / 1000;
      });
      enriched.forEach((m: any) => { m.running_balance = balanceMap[m.id]; });
    }

    res.json({ success: true, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const adjustStock = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { item_id, physical_count, adjustment_reason, adjusted_by } = req.body;

    // Get current stock balance
    const ledger = await prisma.stockLedger.aggregate({
      where: { tenant_id, item_id },
      _sum: { quantity: true }
    });
    const currentQty = ledger._sum.quantity || 0;
    const varianceQty = parseFloat(physical_count) - currentQty;

    if (varianceQty === 0) {
      return res.status(400).json({ success: false, error: 'No variance — system stock matches physical count' });
    }

    // Generate adjustment number
    const adjCount = await prisma.stockLedger.count({ where: { tenant_id, transaction_type: 'adjustment' } });
    const adj_number = `ADJ-${new Date().getFullYear()}-${String(adjCount + 1).padStart(4, '0')}`;

    const adjustment = await prisma.stockLedger.create({
      data: {
        tenant_id,
        item_id,
        transaction_type: 'adjustment',
        quantity: varianceQty,
        reference_type: 'adjustment',
        reference_id: adj_number,
        transacted_by: adjusted_by || 'Storekeeper',
        adjustment_reason
      }
    });

    await prisma.systemAlert.create({
      data: {
        tenant_id,
        alert_type: 'stock_adjustment',
        severity: Math.abs(varianceQty) > 100 ? 'warning' : 'info',
        message: `Stock adjustment ${adj_number} — ${varianceQty > 0 ? '+' : ''}${varianceQty} units. Reason: ${adjustment_reason}`,
        reference_type: 'adjustment',
        reference_id: adj_number
      }
    });

    res.status(201).json({
      success: true,
      data: {
        adj_number,
        item_id,
        system_qty: currentQty,
        physical_count: parseFloat(physical_count),
        variance: varianceQty,
        adjustment_type: varianceQty > 0 ? 'write_up' : 'write_off',
        adjustment
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const issueMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { job_id, item_id, planned_qty, issued_qty, issued_by } = req.body;

    const issue = await prisma.materialIssue.create({
      data: { tenant_id, job_id, item_id, planned_qty, issued_qty, issued_by }
    });

    await prisma.stockLedger.create({
      data: {
        tenant_id,
        item_id,
        transaction_type: 'issue',
        quantity: -issued_qty,
        reference_type: 'job_card',
        reference_id: job_id
      }
    });

    res.status(201).json({ success: true, data: issue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
