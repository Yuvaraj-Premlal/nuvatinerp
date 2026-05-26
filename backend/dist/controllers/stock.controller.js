"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStockReports = exports.issueMaterial = exports.adjustStock = exports.getStockMovements = exports.getStockBalanceByItem = exports.getStockBalance = void 0;
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
        const { job_id, item_id, planned_qty, issued_qty, issued_by } = req.body;
        const count = await prisma_1.default.materialIssue.count({ where: { tenant_id } });
        const slip_number = `MIS-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
        const issue = await prisma_1.default.materialIssue.create({
            data: { tenant_id, job_id, item_id, planned_qty, issued_qty, issued_by }
        });
        await prisma_1.default.stockLedger.create({
            data: {
                tenant_id, item_id,
                transaction_type: 'issue',
                quantity: -issued_qty,
                reference_type: 'job_card',
                reference_id: job_id,
                transacted_by: issued_by
            }
        });
        const item = await prisma_1.default.itemMaster.findUnique({ where: { id: item_id } });
        const jobCard = job_id ? await prisma_1.default.jobCard.findUnique({ where: { id: job_id } }) : null;
        const company = await prisma_1.default.companyConfig.findUnique({ where: { tenant_id } });
        res.status(201).json({ success: true, data: { ...issue, slip_number, item, job_card: jobCard, company } });
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
