"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePO = exports.getPORevisions = exports.shortClosePO = exports.amendPO = exports.cancelPO = exports.updatePOStatus = exports.getPOById = exports.getPOs = exports.createPO = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createPO = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const latest = await prisma_1.default.purchaseOrder.findFirst({ where: { tenant_id }, orderBy: { po_number: 'desc' } });
        const lastNum = latest ? parseInt(latest.po_number.split('-')[2]) : 0;
        const po_number = `PO-${new Date().getFullYear()}-${String(lastNum + 1).padStart(4, '0')}`;
        const { lines, ...header } = req.body;
        const po = await prisma_1.default.purchaseOrder.create({
            data: {
                tenant_id,
                po_number,
                status: 'draft',
                po_date: new Date(),
                supplier_id: header.supplier_id,
                expected_delivery_date: header.expected_delivery_date ? new Date(header.expected_delivery_date) : null,
                payment_terms: header.payment_terms,
                notes: header.notes,
                total_value: header.total_value,
                raised_by: 'user',
                po_lines: {
                    create: lines.map((l) => ({
                        tenant_id,
                        item_id: l.item_id,
                        quantity_ordered: parseFloat(l.quantity_ordered),
                        unit_price: parseFloat(l.unit_price),
                        quantity_received: 0
                    }))
                }
            },
            include: { po_lines: { include: { item: true } }, supplier: true }
        });
        res.status(201).json({ success: true, data: po });
    }
    catch (error) {
        console.error('createPO error:', error.message, error.meta);
        res.status(500).json({ success: false, error: error.message, meta: error.meta });
    }
};
exports.createPO = createPO;
const getPOs = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const pos = await prisma_1.default.purchaseOrder.findMany({
            where: { tenant_id },
            include: { po_lines: { include: { item: true } }, supplier: true },
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, data: pos });
    }
    catch (error) {
        console.error('getPOs error:', error.message, error.meta);
        res.status(500).json({ success: false, error: error.message, meta: error.meta });
    }
};
exports.getPOs = getPOs;
const getPOById = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = String(req.params.id);
        const po = await prisma_1.default.purchaseOrder.findFirst({
            where: { id, tenant_id },
            include: { po_lines: { include: { item: true } }, supplier: true }
        });
        if (!po)
            return res.status(404).json({ success: false, error: 'PO not found' });
        const amendments = await prisma_1.default.pOAmendmentLog.findMany({
            where: { tenant_id, po_number: String(po.po_number) },
            orderBy: { amended_at: 'desc' }
        });
        res.json({ success: true, data: { ...po, amendments } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getPOById = getPOById;
const updatePOStatus = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = String(req.params.id);
        const { status } = req.body;
        await prisma_1.default.purchaseOrder.updateMany({ where: { id, tenant_id }, data: { status } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.updatePOStatus = updatePOStatus;
const cancelPO = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = String(req.params.id);
        const { reason, cancelled_by } = req.body;
        const po = await prisma_1.default.purchaseOrder.findFirst({ where: { id, tenant_id } });
        if (!po)
            return res.status(404).json({ success: false, error: 'PO not found' });
        if (po.status === 'cancelled')
            return res.status(400).json({ success: false, error: 'PO already cancelled' });
        const hasGRN = await prisma_1.default.grnHeader.findFirst({ where: { po_id: id, tenant_id } });
        if (hasGRN)
            return res.status(400).json({ success: false, error: 'Cannot cancel — GRN already raised against this PO' });
        await prisma_1.default.purchaseOrder.updateMany({
            where: { id, tenant_id },
            data: { status: 'cancelled', cancellation_reason: reason, cancelled_at: new Date(), cancelled_by: cancelled_by || 'user' }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.cancelPO = cancelPO;
const amendPO = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = String(req.params.id);
        const { amendment_reason, amended_by, lines, expected_delivery_date, notes } = req.body;
        const originalPO = await prisma_1.default.purchaseOrder.findFirst({ where: { id, tenant_id }, include: { po_lines: true } });
        if (!originalPO)
            return res.status(404).json({ success: false, error: 'PO not found' });
        if (originalPO.status === 'cancelled')
            return res.status(400).json({ success: false, error: 'Cannot amend a cancelled PO' });
        const hasGRN = await prisma_1.default.grnHeader.findFirst({ where: { po_id: id, tenant_id } });
        if (hasGRN)
            return res.status(400).json({ success: false, error: 'Cannot amend — GRN already raised. Raise a new PO instead.' });
        const newRevision = (originalPO.revision_number || 0) + 1;
        await prisma_1.default.purchaseOrder.updateMany({ where: { id, tenant_id }, data: { is_latest_revision: false } });
        const newPO = await prisma_1.default.purchaseOrder.create({
            data: {
                tenant_id,
                po_number: originalPO.po_number,
                revision_number: newRevision,
                is_latest_revision: true,
                parent_po_id: id,
                status: originalPO.status,
                supplier_id: originalPO.supplier_id,
                po_date: originalPO.po_date,
                expected_delivery_date: expected_delivery_date ? new Date(expected_delivery_date) : originalPO.expected_delivery_date,
                raised_by: originalPO.raised_by,
                notes: notes || originalPO.notes,
                amendment_reason,
                po_lines: {
                    create: lines.map((l) => ({
                        tenant_id,
                        item_id: l.item_id,
                        quantity_ordered: parseFloat(l.quantity_ordered),
                        unit_price: parseFloat(l.unit_price),
                        quantity_received: 0
                    }))
                }
            },
            include: { po_lines: { include: { item: true } }, supplier: true }
        });
        await prisma_1.default.pOAmendmentLog.create({
            data: {
                tenant_id,
                po_id: newPO.id,
                po_number: originalPO.po_number,
                revision_from: originalPO.revision_number || 0,
                revision_to: newRevision,
                amended_by: amended_by || 'user',
                amendment_reason,
                changes_summary: `Rev ${originalPO.revision_number || 0} → Rev ${newRevision}`
            }
        });
        res.status(201).json({ success: true, data: newPO });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.amendPO = amendPO;
const shortClosePO = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = String(req.params.id);
        const { closed_by, short_close_reason, override, closure_notes } = req.body;
        const po = await prisma_1.default.purchaseOrder.findFirst({
            where: { id, tenant_id },
            include: { po_lines: true, supplier: true }
        });
        if (!po)
            return res.status(404).json({ success: false, error: 'PO not found' });
        if (po.status !== 'partial_received')
            return res.status(400).json({ success: false, error: 'Short close only allowed on partially received POs' });
        if (!short_close_reason?.trim())
            return res.status(400).json({ success: false, error: 'Short close reason is mandatory' });
        // Calculate short closed qty
        const totalOrdered = po.po_lines.reduce((s, l) => s + l.quantity_ordered, 0);
        const totalReceived = po.po_lines.reduce((s, l) => s + (l.quantity_received || 0), 0);
        const shortClosedQty = totalOrdered - totalReceived;
        // Check supplier bill
        const grns = await prisma_1.default.grnHeader.findMany({ where: { po_id: id, tenant_id, is_reversed: false } });
        const grnIds = grns.map((g) => g.id);
        let billStatus = 'no_bill';
        let billNumber = '';
        if (grnIds.length > 0) {
            const bill = await prisma_1.default.supplierBill.findFirst({ where: { grn_id: { in: grnIds }, tenant_id }, orderBy: { created_at: 'desc' } });
            if (bill) {
                billStatus = bill.status;
                billNumber = bill.bill_number;
            }
        }
        // Block if no bill and goods were received
        if (billStatus === 'no_bill' && totalReceived > 0) {
            return res.status(400).json({ success: false, error: 'Cannot short close — no supplier bill exists for received goods. Create supplier bill first.', bill_status: billStatus });
        }
        // If bill unpaid and no override
        if (billStatus !== 'paid' && billStatus !== 'no_bill' && !override) {
            return res.status(402).json({
                success: false,
                error: `Bill ${billNumber} is ${billStatus}. Settle payment or provide override reason.`,
                bill_status: billStatus,
                bill_number: billNumber,
                requires_override: true,
                short_closed_qty: shortClosedQty
            });
        }
        await prisma_1.default.purchaseOrder.updateMany({
            where: { id, tenant_id },
            data: {
                status: 'closed',
                short_closed: true,
                short_closed_qty: shortClosedQty,
                short_close_reason,
                closed_at: new Date(),
                closed_by: closed_by || 'Purchase Manager',
                closure_notes: closure_notes || null,
                bill_status_at_closure: billStatus
            }
        });
        await prisma_1.default.systemAlert.create({
            data: {
                tenant_id,
                alert_type: 'po_short_closed',
                severity: 'warning',
                message: `PO ${po.po_number} short closed — ${shortClosedQty} units balance written off. Reason: ${short_close_reason}`,
                reference_type: 'purchase_order',
                reference_id: id
            }
        });
        res.json({ success: true, message: `PO short closed. ${shortClosedQty} units written off.`, short_closed_qty: shortClosedQty });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.shortClosePO = shortClosePO;
const getPORevisions = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = String(req.params.id);
        const po = await prisma_1.default.purchaseOrder.findFirst({ where: { id, tenant_id } });
        if (!po)
            return res.status(404).json({ success: false, error: 'PO not found' });
        const allRevisions = await prisma_1.default.purchaseOrder.findMany({
            where: { tenant_id, po_number: po.po_number },
            include: { po_lines: { include: { item: true } } },
            orderBy: { revision_number: 'desc' }
        });
        res.json({ success: true, data: allRevisions });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getPORevisions = getPORevisions;
const closePO = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = String(req.params.id);
        const { closed_by, closure_notes, override } = req.body;
        const po = await prisma_1.default.purchaseOrder.findFirst({ where: { id, tenant_id } });
        if (!po)
            return res.status(404).json({ success: false, error: 'PO not found' });
        if (po.status !== 'received')
            return res.status(400).json({ success: false, error: 'Only received POs can be closed' });
        // Check supplier bill
        const grns = await prisma_1.default.grnHeader.findMany({ where: { po_id: id, tenant_id, is_reversed: false } });
        const grnIds = grns.map((g) => g.id);
        let billStatus = 'no_bill';
        let billNumber = '';
        if (grnIds.length > 0) {
            const bill = await prisma_1.default.supplierBill.findFirst({
                where: { grn_id: { in: grnIds }, tenant_id },
                orderBy: { created_at: 'desc' }
            });
            if (bill) {
                billStatus = bill.status;
                billNumber = bill.bill_number;
            }
        }
        // Block if no bill
        if (billStatus === 'no_bill') {
            return res.status(400).json({
                success: false,
                error: 'Cannot close — no supplier bill exists. Create supplier bill first.',
                bill_status: billStatus
            });
        }
        // If bill unpaid and no override — return info for frontend to show override modal
        if (billStatus !== 'paid' && !override) {
            return res.status(402).json({
                success: false,
                error: `Bill ${billNumber} is ${billStatus}. Settle payment or provide override reason to close.`,
                bill_status: billStatus,
                bill_number: billNumber,
                requires_override: true
            });
        }
        // If override provided — validate reason
        if (billStatus !== 'paid' && override && !closure_notes?.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Override reason is mandatory when closing with unpaid bill.'
            });
        }
        await prisma_1.default.purchaseOrder.updateMany({
            where: { id, tenant_id },
            data: {
                status: 'closed',
                closed_at: new Date(),
                closed_by: closed_by || 'Purchase Manager',
                closure_notes: closure_notes || null,
                bill_status_at_closure: billStatus
            }
        });
        res.json({ success: true, message: billStatus === 'paid' ? 'PO closed successfully' : 'PO closed with override' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.closePO = closePO;
