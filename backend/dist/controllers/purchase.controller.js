"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPORevisions = exports.amendPO = exports.cancelPO = exports.updatePOStatus = exports.getPOById = exports.getPOs = exports.createPO = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createPO = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const count = await prisma_1.default.purchaseOrder.count({ where: { tenant_id } });
        const po_number = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
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
