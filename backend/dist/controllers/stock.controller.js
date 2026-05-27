"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingFifoOverrides = exports.approveFifoOverride = exports.requestFifoOverride = exports.getAvailableBatches = exports.getStockReports = exports.issueMaterial = exports.adjustStock = exports.getStockMovements = exports.getStockBalanceByItem = exports.getStockBalance = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getStockBalance = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const ledger = await prisma_1.default.stockLedger.groupBy({
            by: ['item_id'],
            where: { tenant_id },
            _sum: { quantity: true }
        });
        const items = await prisma_1.default.itemMaster.findMany({
            where: { tenant_id, is_active: true },
            include: { pfep_detail: true }
        });
        const balance = items.map((item) => {
            const ledgerEntry = ledger.find((l) => l.item_id === item.id);
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getStockBalance = getStockBalance;
const getStockBalanceByItem = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const item_id = req.params.item_id;
        const ledger = await prisma_1.default.stockLedger.findMany({
            where: { tenant_id, item_id },
            orderBy: { transacted_at: 'desc' }
        });
        const total = ledger.reduce((sum, l) => sum + l.quantity, 0);
        res.json({ success: true, data: { quantity_on_hand: total, movements: ledger } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getStockBalanceByItem = getStockBalanceByItem;
const getStockMovements = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { item_id, from_date, to_date, transaction_type } = req.query;
        const where = { tenant_id };
        if (item_id)
            where.item_id = String(item_id);
        if (transaction_type)
            where.transaction_type = String(transaction_type);
        if (from_date || to_date) {
            where.transacted_at = {};
            if (from_date)
                where.transacted_at.gte = new Date(String(from_date));
            if (to_date)
                where.transacted_at.lte = new Date(String(to_date) + 'T23:59:59.999Z');
        }
        const movements = await prisma_1.default.stockLedger.findMany({
            where,
            include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true } } },
            orderBy: { transacted_at: 'desc' },
            take: 200
        });
        // Resolve reference numbers
        const enriched = await Promise.all(movements.map(async (m) => {
            let reference_number = m.reference_id?.slice(0, 8) || '—';
            let reference_display = m.reference_type || '—';
            if (m.reference_type === 'grn' && m.reference_id) {
                const grn = await prisma_1.default.grnHeader.findFirst({ where: { id: m.reference_id }, select: { grn_number: true } });
                if (grn)
                    reference_number = grn.grn_number;
                reference_display = 'GRN';
            }
            else if (m.reference_type === 'job_card' && m.reference_id) {
                const jc = await prisma_1.default.jobCard.findFirst({ where: { id: m.reference_id }, select: { job_number: true } });
                if (jc)
                    reference_number = jc.job_number;
                reference_display = 'Job Card';
            }
            else if (m.reference_type === 'dispatch' && m.reference_id) {
                const d = await prisma_1.default.dispatchHeader.findFirst({ where: { id: m.reference_id }, select: { dispatch_number: true } });
                if (d)
                    reference_number = d.dispatch_number;
                reference_display = 'Dispatch';
            }
            else if (m.reference_type === 'grn_reversal') {
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
            const allMovements = await prisma_1.default.stockLedger.findMany({
                where: { tenant_id, item_id: String(item_id) },
                orderBy: { transacted_at: 'asc' }
            });
            let runningBalance = 0;
            const balanceMap = {};
            allMovements.forEach((m) => {
                runningBalance += m.quantity;
                balanceMap[m.id] = Math.round(runningBalance * 1000) / 1000;
            });
            enriched.forEach((m) => { m.running_balance = balanceMap[m.id]; });
        }
        res.json({ success: true, data: enriched });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getStockMovements = getStockMovements;
const adjustStock = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { item_id, physical_count, adjustment_reason, adjusted_by } = req.body;
        // Get current stock balance
        const ledger = await prisma_1.default.stockLedger.aggregate({
            where: { tenant_id, item_id },
            _sum: { quantity: true }
        });
        const currentQty = ledger._sum.quantity || 0;
        const varianceQty = parseFloat(physical_count) - currentQty;
        if (varianceQty === 0) {
            return res.status(400).json({ success: false, error: 'No variance — system stock matches physical count' });
        }
        // Generate adjustment number
        const adjCount = await prisma_1.default.stockLedger.count({ where: { tenant_id, transaction_type: 'adjustment' } });
        const adj_number = `ADJ-${new Date().getFullYear()}-${String(adjCount + 1).padStart(4, '0')}`;
        const adjustment = await prisma_1.default.stockLedger.create({
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
        await prisma_1.default.systemAlert.create({
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.adjustStock = adjustStock;
const issueMaterial = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { job_id, item_id, planned_qty, issued_qty, issued_by, lines } = req.body;
        // lines: [{ batch_number, grn_id, qty, fifo_override, override_reason, override_request_id }]
        // Generate group slip number
        const groupCount = await prisma_1.default.materialIssueGroup.count({ where: { tenant_id } });
        const slip_number = `MIS-${new Date().getFullYear()}-${String(groupCount + 1).padStart(4, '0')}`;
        const total_issued_qty = lines.reduce((s, l) => s + parseFloat(l.qty), 0);
        const is_fifo_override = lines.some((l) => l.fifo_override);
        // Create issue group
        const group = await prisma_1.default.materialIssueGroup.create({
            data: { tenant_id, slip_number, job_id, item_id, planned_qty: parseFloat(planned_qty), total_issued_qty, issued_by, is_fifo_override }
        });
        // Create individual issue lines and stock ledger entries
        const issueLines = [];
        for (const line of lines) {
            const qty = parseFloat(line.qty);
            const issue = await prisma_1.default.materialIssue.create({
                data: {
                    tenant_id, job_id, item_id,
                    planned_qty: parseFloat(planned_qty),
                    issued_qty: qty,
                    issued_by,
                    batch_number: line.batch_number || null,
                    grn_id: line.grn_id || null,
                    fifo_override: line.fifo_override || false,
                    override_reason: line.override_reason || null,
                    override_request_id: line.override_request_id || null,
                    group_id: group.id
                }
            });
            await prisma_1.default.stockLedger.create({
                data: {
                    tenant_id, item_id,
                    transaction_type: 'issue',
                    quantity: -qty,
                    reference_type: 'job_card',
                    reference_id: job_id,
                    transacted_by: issued_by,
                    batch_number: line.batch_number || null
                }
            });
            if (line.override_request_id) {
                await prisma_1.default.fifoOverrideRequest.updateMany({
                    where: { id: String(line.override_request_id), tenant_id: String(tenant_id) },
                    data: { status: 'used' }
                });
            }
            issueLines.push(issue);
        }
        const item = await prisma_1.default.itemMaster.findUnique({ where: { id: item_id } });
        const jobCard = job_id ? await prisma_1.default.jobCard.findUnique({ where: { id: job_id } }) : null;
        const company = await prisma_1.default.companyConfig.findUnique({ where: { tenant_id } });
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.issueMaterial = issueMaterial;
const getStockReports = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { type, from_date, to_date } = req.query;
        const ledger = await prisma_1.default.stockLedger.groupBy({
            by: ['item_id'],
            where: { tenant_id },
            _sum: { quantity: true }
        });
        const items = await prisma_1.default.itemMaster.findMany({
            where: { tenant_id, is_active: true },
            include: { pfep_detail: true, item_suppliers: { include: { supplier: true } } }
        });
        const balanceMap = {};
        ledger.forEach((l) => { balanceMap[l.item_id] = l._sum.quantity || 0; });
        if (type === 'stock_statement') {
            const rows = items.map((item) => {
                const qty = balanceMap[item.id] || 0;
                const unit_cost = item.material_cost || 0;
                const reorder = item.pfep_detail?.reorder_point || 0;
                const safety = item.pfep_detail?.safety_stock || 0;
                const zone = qty <= 0 ? 'red' : qty <= safety ? 'red' : qty <= reorder ? 'yellow' : 'green';
                return { item_code: item.item_code, item_name: item.item_name, item_type: item.item_type, unit_of_measure: item.unit_of_measure, storage_location: item.pfep_detail?.storage_location || '—', quantity_on_hand: qty, safety_stock: safety, reorder_point: reorder, unit_cost, total_value: qty * unit_cost, zone };
            });
            return res.json({ success: true, data: rows, summary: { grand_total: rows.reduce((s, r) => s + r.total_value, 0), total_items: rows.length } });
        }
        if (type === 'reorder') {
            const rows = items
                .filter((item) => (balanceMap[item.id] || 0) <= (item.pfep_detail?.reorder_point || 0))
                .map((item) => {
                const qty = balanceMap[item.id] || 0;
                const reorder = item.pfep_detail?.reorder_point || 0;
                const safety = item.pfep_detail?.safety_stock || 0;
                return { item_code: item.item_code, item_name: item.item_name, unit_of_measure: item.unit_of_measure, quantity_on_hand: qty, safety_stock: safety, reorder_point: reorder, suggested_order_qty: Math.max(0, reorder * 2 - qty), zone: qty <= safety ? 'red' : 'yellow', supplier: item.item_suppliers?.[0]?.supplier?.supplier_name || '—' };
            })
                .sort((a, b) => a.quantity_on_hand - b.quantity_on_hand);
            return res.json({ success: true, data: rows, summary: { total_items: rows.length, critical: rows.filter((r) => r.zone === 'red').length } });
        }
        if (type === 'consumption') {
            const where = { tenant_id };
            if (from_date)
                where.issued_at = { ...where.issued_at, gte: new Date(String(from_date)) };
            if (to_date)
                where.issued_at = { ...where.issued_at, lte: new Date(String(to_date) + 'T23:59:59.999Z') };
            const issues = await prisma_1.default.materialIssue.findMany({ where, include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true, material_cost: true } }, job: { select: { job_number: true } } }, orderBy: { issued_at: 'desc' } });
            const itemMap = {};
            issues.forEach((issue) => {
                const key = issue.item_id;
                if (!itemMap[key])
                    itemMap[key] = { item_code: issue.item?.item_code, item_name: issue.item?.item_name, unit_of_measure: issue.item?.unit_of_measure, unit_cost: issue.item?.material_cost || 0, total_issued: 0, total_value: 0, issue_count: 0, jobs: [] };
                itemMap[key].total_issued += issue.issued_qty;
                itemMap[key].total_value += issue.issued_qty * (issue.item?.material_cost || 0);
                itemMap[key].issue_count += 1;
                itemMap[key].jobs.push({ job_number: issue.job?.job_number || '—', issued_qty: issue.issued_qty, issued_at: issue.issued_at });
            });
            const rows = Object.values(itemMap).sort((a, b) => b.total_value - a.total_value);
            return res.json({ success: true, data: rows, summary: { grand_total: rows.reduce((s, r) => s + r.total_value, 0), total_issues: issues.length, total_items: rows.length } });
        }
        if (type === 'abc') {
            const issues = await prisma_1.default.materialIssue.findMany({ where: { tenant_id }, include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true, material_cost: true } } } });
            const itemMap = {};
            issues.forEach((issue) => {
                const key = issue.item_id;
                if (!itemMap[key])
                    itemMap[key] = { item_code: issue.item?.item_code, item_name: issue.item?.item_name, unit_of_measure: issue.item?.unit_of_measure, total_issued: 0, consumption_value: 0 };
                itemMap[key].total_issued += issue.issued_qty;
                itemMap[key].consumption_value += issue.issued_qty * (issue.item?.material_cost || 0);
            });
            const sorted = Object.values(itemMap).sort((a, b) => b.consumption_value - a.consumption_value);
            const grand_total = sorted.reduce((s, r) => s + r.consumption_value, 0);
            let cumulative = 0;
            const classified = sorted.map((r) => {
                cumulative += r.consumption_value;
                const pct = grand_total > 0 ? (cumulative / grand_total) * 100 : 0;
                return { ...r, cumulative_pct: Math.round(pct * 10) / 10, abc_class: pct <= 70 ? 'A' : pct <= 90 ? 'B' : 'C' };
            });
            return res.json({ success: true, data: classified, summary: { grand_total, a_count: classified.filter((r) => r.abc_class === 'A').length, b_count: classified.filter((r) => r.abc_class === 'B').length, c_count: classified.filter((r) => r.abc_class === 'C').length, total_items: classified.length } });
        }
        return res.status(400).json({ success: false, error: 'Invalid report type' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getStockReports = getStockReports;
const getAvailableBatches = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { item_id } = req.query;
        if (!item_id)
            return res.status(400).json({ success: false, error: 'item_id required' });
        // Get all GRN lines for this item with batch numbers, ordered by received date (FIFO)
        const grnLines = await prisma_1.default.grnLine.findMany({
            where: { tenant_id, item_id: String(item_id), batch_number: { not: null } },
            include: {
                grn: { include: { po: { select: { po_number: true } } } },
                item: { select: { item_name: true, item_code: true, unit_of_measure: true } }
            },
            orderBy: { grn: { received_date: 'asc' } }
        });
        // For each GRN line, calculate remaining balance
        const batches = await Promise.all(grnLines.map(async (line) => {
            // Total issued from this batch
            const issued = await prisma_1.default.stockLedger.aggregate({
                where: { tenant_id, item_id: String(item_id), batch_number: line.batch_number, transaction_type: 'issue' },
                _sum: { quantity: true }
            });
            const issuedQty = Math.abs(issued._sum.quantity || 0);
            const acceptedQty = line.accepted_qty || line.quantity_received;
            // Deduct quarantined qty for this batch
            const quarantined = await prisma_1.default.stockLedger.aggregate({
                where: { tenant_id, item_id: String(item_id), batch_number: line.batch_number, transaction_type: 'quarantine' },
                _sum: { quantity: true }
            });
            const quarantinedQty = Math.abs(quarantined._sum.quantity || 0);
            const remaining = acceptedQty - issuedQty - quarantinedQty;
            // Get supplier name
            let supplier_name = '—';
            if (line.grn?.supplier_id) {
                const supplier = await prisma_1.default.supplierMaster.findUnique({
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
                unit_of_measure: line.item?.unit_of_measure
            };
        }));
        // Filter out exhausted batches and sort oldest first
        const available = batches
            .filter((b) => b.remaining_qty > 0)
            .sort((a, b) => new Date(a.received_date).getTime() - new Date(b.received_date).getTime());
        // Mark first as FIFO recommended
        if (available.length > 0)
            available[0].fifo_recommended = true;
        res.json({ success: true, data: available });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getAvailableBatches = getAvailableBatches;
const requestFifoOverride = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { item_id, requested_grn_id, available_grn_id, reason, requested_by } = req.body;
        const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
        const overrideRequest = await prisma_1.default.fifoOverrideRequest.create({
            data: { tenant_id: String(tenant_id), item_id: String(item_id), requested_grn_id: String(requested_grn_id), available_grn_id: String(available_grn_id), reason: String(reason), requested_by: String(requested_by || ''), expires_at, status: 'pending' }
        });
        // Get item name for alert
        const item = await prisma_1.default.itemMaster.findUnique({ where: { id: item_id }, select: { item_name: true } });
        const availableGrn = await prisma_1.default.grnHeader.findUnique({ where: { id: available_grn_id }, select: { grn_number: true } });
        const requestedGrn = await prisma_1.default.grnHeader.findUnique({ where: { id: requested_grn_id }, select: { grn_number: true } });
        // Notify owner via system alert
        await prisma_1.default.systemAlert.create({
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.requestFifoOverride = requestFifoOverride;
const approveFifoOverride = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { id } = req.params;
        const { action, approved_by, rejection_note } = req.body; // action: 'approve' | 'reject'
        const overrideRequest = await prisma_1.default.fifoOverrideRequest.findFirst({ where: { id: String(id), tenant_id: String(tenant_id) } });
        if (!overrideRequest)
            return res.status(404).json({ success: false, error: 'Override request not found' });
        if (overrideRequest.status !== 'pending')
            return res.status(400).json({ success: false, error: 'Request already actioned' });
        const now = new Date();
        if (now > overrideRequest.expires_at) {
            await prisma_1.default.fifoOverrideRequest.updateMany({ where: { id: String(id) }, data: { status: 'expired' } });
            return res.status(400).json({ success: false, error: 'Override request has expired' });
        }
        const updated = await prisma_1.default.fifoOverrideRequest.update({
            where: { id: String(id) },
            data: {
                status: action === 'approve' ? 'approved' : 'rejected',
                approved_by,
                approved_at: now,
                rejection_note: action === 'reject' ? rejection_note : null
            }
        });
        // Resolve the system alert
        await prisma_1.default.systemAlert.updateMany({
            where: { tenant_id: String(tenant_id), reference_type: 'fifo_override', reference_id: String(id) },
            data: { is_resolved: true, resolved_at: now, resolved_by: approved_by }
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.approveFifoOverride = approveFifoOverride;
const getPendingFifoOverrides = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        // Auto-expire old requests first
        await prisma_1.default.fifoOverrideRequest.updateMany({
            where: { tenant_id, status: 'pending', expires_at: { lt: new Date() } },
            data: { status: 'expired' }
        });
        const overrides = await prisma_1.default.fifoOverrideRequest.findMany({
            where: { tenant_id: String(tenant_id), status: 'pending' },
            include: { item: { select: { item_name: true, item_code: true } } },
            orderBy: { created_at: 'desc' }
        });
        // Enrich with GRN numbers
        const enriched = await Promise.all(overrides.map(async (o) => {
            const availableGrn = await prisma_1.default.grnHeader.findUnique({ where: { id: o.available_grn_id }, select: { grn_number: true, received_date: true } });
            const requestedGrn = await prisma_1.default.grnHeader.findUnique({ where: { id: o.requested_grn_id }, select: { grn_number: true, received_date: true } });
            return { ...o, available_grn: availableGrn, requested_grn: requestedGrn };
        }));
        res.json({ success: true, data: enriched });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getPendingFifoOverrides = getPendingFifoOverrides;
