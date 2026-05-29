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
    const { job_id, item_id, planned_qty, issued_qty, issued_by, to_location, mwo_id, lines } = req.body;
    // lines: [{ batch_number, grn_id, qty, fifo_override, override_reason, override_request_id }]

    // Generate group slip number
    const groupCount = await prisma.materialIssueGroup.count({ where: { tenant_id } });
    const slip_number = `MIS-${new Date().getFullYear()}-${String(groupCount + 1).padStart(4, '0')}`;
    const total_issued_qty = lines.reduce((s: number, l: any) => s + parseFloat(l.qty), 0);
    const is_fifo_override = lines.some((l: any) => l.fifo_override);

    // Create issue group
    const group = await prisma.materialIssueGroup.create({
      data: { tenant_id, slip_number, job_id: job_id || null, mwo_id: mwo_id || null, item_id, planned_qty: parseFloat(planned_qty || '0'), total_issued_qty, issued_by, is_fifo_override }
    });

    // Create individual issue lines and stock ledger entries
    const issueLines = [];
    for (const line of lines) {
      const qty = parseFloat(line.qty);
      // Fetch from_location from grn_line batch
      let from_location: string | null = null;
      if (line.grn_id && line.batch_number) {
        const grnLine = await prisma.grnLine.findFirst({
          where: { grn_id: line.grn_id, batch_number: line.batch_number, tenant_id }
        });
        from_location = grnLine?.location || null;
      }
      const issue = await prisma.materialIssue.create({
        data: {
          tenant_id, job_id: job_id || null, item_id,
          mwo_id: mwo_id || null,
          planned_qty: parseFloat(planned_qty || '0'),
          issued_qty: qty,
          issued_by,
          location: from_location,
          to_location: to_location || null,
          batch_number: line.batch_number || null,
          grn_id: line.grn_id || null,
          fifo_override: line.fifo_override || false,
          override_reason: line.override_reason || null,
          override_request_id: line.override_request_id || null,
          group_id: group.id
        }
      });
      await prisma.stockLedger.create({
        data: {
          tenant_id, item_id,
          transaction_type: 'issue',
          quantity: -qty,
          reference_type: mwo_id ? 'mwo' : 'job_card',
          reference_id: mwo_id ? mwo_id : job_id,
          transacted_by: issued_by,
          location: from_location,
          to_location: to_location || null,
          batch_number: line.batch_number || null
        }
      });
      if (line.override_request_id) {
        await prisma.fifoOverrideRequest.updateMany({
          where: { id: String(line.override_request_id), tenant_id: String(tenant_id) },
          data: { status: 'used' }
        });
      }
      issueLines.push(issue);
    }

    const item = await prisma.itemMaster.findUnique({ where: { id: item_id } });
    const jobCard = job_id ? await prisma.jobCard.findUnique({ where: { id: job_id } }) : null;
    const company = await prisma.companyConfig.findUnique({ where: { tenant_id } });

    res.status(201).json({
      success: true,
      data: {
        ...group,
        slip_number,
        lines: issueLines,
        item,
        job_card: jobCard,
        company,
        issued_qty: total_issued_qty
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};



export const getStockReports = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { type, from_date, to_date } = req.query;

    const ledger = await prisma.stockLedger.groupBy({
      by: ['item_id'],
      where: { tenant_id },
      _sum: { quantity: true }
    });
    const items = await prisma.itemMaster.findMany({
      where: { tenant_id, is_active: true },
      include: { pfep_detail: true, item_suppliers: { include: { supplier: true } } }
    });
    const balanceMap: Record<string, number> = {};
    ledger.forEach((l: any) => { balanceMap[l.item_id] = l._sum.quantity || 0; });

    if (type === 'stock_statement') {
      const rows = items.map((item: any) => {
        const qty = balanceMap[item.id] || 0;
        const unit_cost = item.material_cost || 0;
        const reorder = item.pfep_detail?.reorder_point || 0;
        const safety = item.pfep_detail?.safety_stock || 0;
        const zone = qty <= 0 ? 'red' : qty <= safety ? 'red' : qty <= reorder ? 'yellow' : 'green';
        return { item_code: item.item_code, item_name: item.item_name, item_type: item.item_type, unit_of_measure: item.unit_of_measure, storage_location: item.pfep_detail?.storage_location || '—', quantity_on_hand: qty, safety_stock: safety, reorder_point: reorder, unit_cost, total_value: qty * unit_cost, zone };
      });
      return res.json({ success: true, data: rows, summary: { grand_total: rows.reduce((s: number, r: any) => s + r.total_value, 0), total_items: rows.length } });
    }

    if (type === 'reorder') {
      const rows = items
        .filter((item: any) => (balanceMap[item.id] || 0) <= (item.pfep_detail?.reorder_point || 0))
        .map((item: any) => {
          const qty = balanceMap[item.id] || 0;
          const reorder = item.pfep_detail?.reorder_point || 0;
          const safety = item.pfep_detail?.safety_stock || 0;
          return { item_code: item.item_code, item_name: item.item_name, unit_of_measure: item.unit_of_measure, quantity_on_hand: qty, safety_stock: safety, reorder_point: reorder, suggested_order_qty: Math.max(0, reorder * 2 - qty), zone: qty <= safety ? 'red' : 'yellow', supplier: item.item_suppliers?.[0]?.supplier?.supplier_name || '—' };
        })
        .sort((a: any, b: any) => a.quantity_on_hand - b.quantity_on_hand);
      return res.json({ success: true, data: rows, summary: { total_items: rows.length, critical: rows.filter((r: any) => r.zone === 'red').length } });
    }

    if (type === 'consumption') {
      const where: any = { tenant_id };
      if (from_date) where.issued_at = { ...where.issued_at, gte: new Date(String(from_date)) };
      if (to_date) where.issued_at = { ...where.issued_at, lte: new Date(String(to_date) + 'T23:59:59.999Z') };
      const issues = await prisma.materialIssue.findMany({ where, include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true, material_cost: true } }, job: { select: { job_number: true } } }, orderBy: { issued_at: 'desc' } });
      const itemMap: Record<string, any> = {};
      issues.forEach((issue: any) => {
        const key = issue.item_id;
        if (!itemMap[key]) itemMap[key] = { item_code: issue.item?.item_code, item_name: issue.item?.item_name, unit_of_measure: issue.item?.unit_of_measure, unit_cost: issue.item?.material_cost || 0, total_issued: 0, total_value: 0, issue_count: 0, jobs: [] };
        itemMap[key].total_issued += issue.issued_qty;
        itemMap[key].total_value += issue.issued_qty * (issue.item?.material_cost || 0);
        itemMap[key].issue_count += 1;
        itemMap[key].jobs.push({ job_number: issue.job?.job_number || '—', issued_qty: issue.issued_qty, issued_at: issue.issued_at });
      });
      const rows = Object.values(itemMap).sort((a: any, b: any) => b.total_value - a.total_value);
      return res.json({ success: true, data: rows, summary: { grand_total: rows.reduce((s: number, r: any) => s + r.total_value, 0), total_issues: issues.length, total_items: rows.length } });
    }

    if (type === 'abc') {
      const issues = await prisma.materialIssue.findMany({ where: { tenant_id }, include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true, material_cost: true } } } });
      const itemMap: Record<string, any> = {};
      issues.forEach((issue: any) => {
        const key = issue.item_id;
        if (!itemMap[key]) itemMap[key] = { item_code: issue.item?.item_code, item_name: issue.item?.item_name, unit_of_measure: issue.item?.unit_of_measure, total_issued: 0, consumption_value: 0 };
        itemMap[key].total_issued += issue.issued_qty;
        itemMap[key].consumption_value += issue.issued_qty * (issue.item?.material_cost || 0);
      });
      const sorted = Object.values(itemMap).sort((a: any, b: any) => b.consumption_value - a.consumption_value);
      const grand_total = sorted.reduce((s: number, r: any) => s + r.consumption_value, 0);
      let cumulative = 0;
      const classified = sorted.map((r: any) => {
        cumulative += r.consumption_value;
        const pct = grand_total > 0 ? (cumulative / grand_total) * 100 : 0;
        return { ...r, cumulative_pct: Math.round(pct * 10) / 10, abc_class: pct <= 70 ? 'A' : pct <= 90 ? 'B' : 'C' };
      });
      return res.json({ success: true, data: classified, summary: { grand_total, a_count: classified.filter((r: any) => r.abc_class === 'A').length, b_count: classified.filter((r: any) => r.abc_class === 'B').length, c_count: classified.filter((r: any) => r.abc_class === 'C').length, total_items: classified.length } });
    }

    return res.status(400).json({ success: false, error: 'Invalid report type' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAvailableBatches = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { item_id } = req.query;
    if (!item_id) return res.status(400).json({ success: false, error: 'item_id required' });

    // Get all GRN lines for this item with batch numbers, ordered by received date (FIFO)
    const grnLines = await prisma.grnLine.findMany({
      where: { tenant_id, item_id: String(item_id), batch_number: { not: null } },
      include: {
        grn: { include: { po: { select: { po_number: true } } } },
        item: { select: { item_name: true, item_code: true, unit_of_measure: true } }
      },
      orderBy: { grn: { received_date: 'asc' } }
    });

    // For each GRN line, calculate remaining balance
    const batches = await Promise.all(grnLines.map(async (line: any) => {
      // Total issued from this batch
      const issued = await prisma.stockLedger.aggregate({
        where: { tenant_id, item_id: String(item_id), batch_number: line.batch_number, transaction_type: 'issue' },
        _sum: { quantity: true }
      });
      const issuedQty = Math.abs(issued._sum.quantity || 0);
      const acceptedQty = line.accepted_qty || line.quantity_received;

      // Deduct quarantined qty for this batch
      const quarantined = await prisma.stockLedger.aggregate({
        where: { tenant_id, item_id: String(item_id), batch_number: line.batch_number, transaction_type: 'quarantine' },
        _sum: { quantity: true }
      });
      const quarantinedQty = Math.abs(quarantined._sum.quantity || 0);

      const remaining = acceptedQty - issuedQty - quarantinedQty;

      // Get supplier name
      let supplier_name = '—';
      if (line.grn?.supplier_id) {
        const supplier = await prisma.supplierMaster.findUnique({
          where: { id: line.grn.supplier_id },
          select: { supplier_name: true }
        });
        supplier_name = supplier?.supplier_name || '—';
      }

      return {
        grn_id: line.grn_id,
        grn_number: line.grn?.grn_number,
        grn_line_id: line.id,
        batch_number: line.batch_number,
        lot_number: line.lot_number,
        received_date: line.grn?.received_date,
        po_number: line.grn?.po?.po_number || '—',
        supplier_name,
        accepted_qty: acceptedQty,
        issued_qty: issuedQty,
        remaining_qty: Math.max(0, remaining),
        location: line.location || null,
        unit_of_measure: line.item?.unit_of_measure
      };
    }));

    // Filter out exhausted batches and sort oldest first
    const available = batches
      .filter((b: any) => b.remaining_qty > 0)
      .sort((a: any, b: any) => new Date(a.received_date).getTime() - new Date(b.received_date).getTime());

    // Mark first as FIFO recommended
    if (available.length > 0) (available[0] as any).fifo_recommended = true;

    res.json({ success: true, data: available });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const requestFifoOverride = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { item_id, requested_grn_id, available_grn_id, reason, requested_by } = req.body;

    const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    const overrideRequest = await prisma.fifoOverrideRequest.create({
      data: { tenant_id: String(tenant_id), item_id: String(item_id), requested_grn_id: String(requested_grn_id), available_grn_id: String(available_grn_id), reason: String(reason), requested_by: String(requested_by || ''), expires_at, status: 'pending' }
    });

    // Get item name for alert
    const item = await prisma.itemMaster.findUnique({ where: { id: item_id }, select: { item_name: true } });
    const availableGrn = await prisma.grnHeader.findUnique({ where: { id: available_grn_id }, select: { grn_number: true } });
    const requestedGrn = await prisma.grnHeader.findUnique({ where: { id: requested_grn_id }, select: { grn_number: true } });

    // Notify owner via system alert
    await prisma.systemAlert.create({
      data: {
        tenant_id,
        alert_type: 'fifo_override_request',
        severity: 'warning',
        message: `FIFO Override Request — ${item?.item_name}: ${requested_by} wants to issue from ${requestedGrn?.grn_number} while ${availableGrn?.grn_number} is available. Reason: ${reason}. Expires in 60 minutes.`,
        reference_type: 'fifo_override',
        reference_id: overrideRequest.id
      }
    });

    res.status(201).json({ success: true, data: overrideRequest });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const approveFifoOverride = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { id } = req.params;
    const { action, approved_by, rejection_note } = req.body; // action: 'approve' | 'reject'

    const overrideRequest = await prisma.fifoOverrideRequest.findFirst({ where: { id: String(id), tenant_id: String(tenant_id) } });
    if (!overrideRequest) return res.status(404).json({ success: false, error: 'Override request not found' });
    if (overrideRequest.status !== 'pending') return res.status(400).json({ success: false, error: 'Request already actioned' });

    const now = new Date();
    if (now > overrideRequest.expires_at) {
      await prisma.fifoOverrideRequest.updateMany({ where: { id: String(id) }, data: { status: 'expired' } });
      return res.status(400).json({ success: false, error: 'Override request has expired' });
    }

    const updated = await prisma.fifoOverrideRequest.update({
      where: { id: String(id) },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_by,
        approved_at: now,
        rejection_note: action === 'reject' ? rejection_note : null
      }
    });

    // Resolve the system alert
    await prisma.systemAlert.updateMany({
      where: { tenant_id: String(tenant_id), reference_type: 'fifo_override', reference_id: String(id) },
      data: { is_resolved: true, resolved_at: now, resolved_by: approved_by }
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPendingFifoOverrides = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;

    // Auto-expire old requests first
    await prisma.fifoOverrideRequest.updateMany({
      where: { tenant_id, status: 'pending', expires_at: { lt: new Date() } },
      data: { status: 'expired' }
    });

    const overrides = await prisma.fifoOverrideRequest.findMany({
      where: { tenant_id: String(tenant_id), status: 'pending' },
      include: { item: { select: { item_name: true, item_code: true } } },
      orderBy: { created_at: 'desc' }
    });

    // Enrich with GRN numbers
    const enriched = await Promise.all((overrides as any[]).map(async (o: any) => {
      const availableGrn = await prisma.grnHeader.findUnique({ where: { id: o.available_grn_id }, select: { grn_number: true, received_date: true } });
      const requestedGrn = await prisma.grnHeader.findUnique({ where: { id: o.requested_grn_id }, select: { grn_number: true, received_date: true } });
      return { ...o, available_grn: availableGrn, requested_grn: requestedGrn };
    }));

    res.json({ success: true, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getIssueHistory = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { job_id, item_id, from_date, to_date } = req.query;

    const where: any = { tenant_id };
    if (job_id) where.job_id = String(job_id);
    if (item_id) where.item_id = String(item_id);
    if (from_date || to_date) {
      where.issued_at = {};
      if (from_date) where.issued_at.gte = new Date(String(from_date));
      if (to_date) where.issued_at.lte = new Date(String(to_date) + 'T23:59:59.999Z');
    }

    const groups = await prisma.materialIssueGroup.findMany({
      where,
      include: {
        item: { select: { item_name: true, item_code: true, unit_of_measure: true } },
        job: { select: { job_number: true } },
        lines: {
          include: {
            item: { select: { item_name: true, unit_of_measure: true } }
          }
        }
      },
      orderBy: { issued_at: 'desc' },
      take: 100
    });

    // Enrich with company for reprint
    const company = await prisma.companyConfig.findUnique({ where: { tenant_id } });

    res.json({ success: true, data: groups.map((g: any) => ({ ...g, company })) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
