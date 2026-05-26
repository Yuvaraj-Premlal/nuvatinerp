"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBatchTrace = exports.getBatches = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getBatches = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { search } = req.query;
        const grnLines = await prisma_1.default.grnLine.findMany({
            where: {
                tenant_id,
                batch_number: search
                    ? { contains: String(search), mode: 'insensitive' }
                    : { not: null }
            },
            include: {
                item: { select: { item_name: true, item_code: true, unit_of_measure: true } },
                grn: { include: { po: { select: { po_number: true } } } }
            },
            orderBy: { created_at: 'desc' }
        });
        const batchMap = {};
        for (const line of grnLines) {
            const key = `${line.batch_number}__${line.item_id}`;
            if (!batchMap[key]) {
                let supplier_name = '—';
                if (line.grn?.supplier_id) {
                    const supplier = await prisma_1.default.supplierMaster.findUnique({
                        where: { id: line.grn.supplier_id },
                        select: { supplier_name: true }
                    });
                    supplier_name = supplier?.supplier_name || '—';
                }
                batchMap[key] = {
                    batch_number: line.batch_number,
                    lot_number: line.lot_number,
                    item_id: line.item_id,
                    item_code: line.item?.item_code,
                    item_name: line.item?.item_name,
                    unit_of_measure: line.item?.unit_of_measure,
                    supplier_name,
                    po_number: line.grn?.po?.po_number || '—',
                    grn_number: line.grn?.grn_number,
                    received_date: line.grn?.received_date || line.created_at,
                    total_received: 0,
                    total_accepted: 0,
                    total_rejected: 0
                };
            }
            batchMap[key].total_received += line.quantity_received || 0;
            batchMap[key].total_accepted += line.accepted_qty || line.quantity_received || 0;
            batchMap[key].total_rejected += line.rejected_qty || 0;
        }
        const batches = Object.values(batchMap).sort((a, b) => new Date(b.received_date).getTime() - new Date(a.received_date).getTime());
        res.json({ success: true, data: batches });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getBatches = getBatches;
const getBatchTrace = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { batch_number } = req.params;
        const grnLines = await prisma_1.default.grnLine.findMany({
            where: { tenant_id, batch_number: String(batch_number) },
            include: {
                item: { select: { item_name: true, item_code: true, unit_of_measure: true } },
                grn: { include: { po: { select: { po_number: true } } } }
            }
        });
        const enrichedGrnLines = await Promise.all(grnLines.map(async (line) => {
            let supplier_name = '—';
            if (line.grn?.supplier_id) {
                const supplier = await prisma_1.default.supplierMaster.findUnique({
                    where: { id: line.grn.supplier_id },
                    select: { supplier_name: true }
                });
                supplier_name = supplier?.supplier_name || '—';
            }
            return { ...line, supplier_name };
        }));
        const stockMovements = await prisma_1.default.stockLedger.findMany({
            where: { tenant_id, batch_number: String(batch_number) },
            include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true } } },
            orderBy: { transacted_at: 'asc' }
        });
        const enrichedMovements = await Promise.all(stockMovements.map(async (m) => {
            let reference_number = m.reference_id?.slice(0, 8) || '—';
            if (m.reference_type === 'grn' && m.reference_id) {
                const grn = await prisma_1.default.grnHeader.findFirst({ where: { id: m.reference_id }, select: { grn_number: true } });
                if (grn)
                    reference_number = grn.grn_number;
            }
            else if (m.reference_type === 'job_card' && m.reference_id) {
                const jc = await prisma_1.default.jobCard.findFirst({ where: { id: m.reference_id }, select: { job_number: true } });
                if (jc)
                    reference_number = jc.job_number;
            }
            return { ...m, reference_number };
        }));
        const batchIssueJobIds = new Set(enrichedMovements
            .filter((m) => m.transaction_type === 'issue')
            .map((m) => m.reference_id));
        const batchIssues = batchIssueJobIds.size > 0
            ? await prisma_1.default.materialIssue.findMany({
                where: { tenant_id, job_id: { in: Array.from(batchIssueJobIds) } },
                include: {
                    item: { select: { item_name: true, item_code: true, unit_of_measure: true } },
                    job: { select: { job_number: true, part_name: true, quantity: true } }
                }
            })
            : [];
        const totalReceived = enrichedGrnLines.reduce((s, l) => s + (l.quantity_received || 0), 0);
        const totalIssued = enrichedMovements.filter((m) => m.transaction_type === 'issue').reduce((s, m) => s + Math.abs(m.quantity), 0);
        const currentBalance = enrichedMovements.reduce((s, m) => s + m.quantity, 0);
        res.json({
            success: true,
            data: {
                batch_number,
                summary: { total_received: totalReceived, total_issued: totalIssued, current_balance: currentBalance },
                grn_receipts: enrichedGrnLines,
                stock_movements: enrichedMovements,
                job_issues: batchIssues
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getBatchTrace = getBatchTrace;
