"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGRNs = exports.createGRN = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createGRN = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { grn_number, po_id, supplier_id, received_by, vehicle_number, supplier_dc_number, lines } = req.body;
        const grn = await prisma_1.default.grnHeader.create({
            data: {
                tenant_id, grn_number, po_id, supplier_id, received_by, vehicle_number, supplier_dc_number,
                grn_lines: {
                    create: lines.map((l) => ({
                        tenant_id,
                        item_id: l.item_id,
                        quantity_received: l.quantity_received,
                        accepted_qty: l.accepted_qty,
                        rejected_qty: l.rejected_qty,
                        rejection_reason: l.rejection_reason,
                        batch_number: l.batch_number,
                        lot_number: l.lot_number,
                        unit_price: l.unit_price
                    }))
                }
            },
            include: { grn_lines: true }
        });
        for (const line of lines) {
            await prisma_1.default.stockLedger.create({
                data: {
                    tenant_id,
                    item_id: line.item_id,
                    transaction_type: 'receipt',
                    quantity: line.accepted_qty || line.quantity_received,
                    unit_cost: line.unit_price,
                    reference_type: 'grn',
                    reference_id: grn.id,
                    batch_number: line.batch_number,
                    lot_number: line.lot_number
                }
            });
        }
        // Auto-update PO status to received if all lines fully received
        if (po_id) {
            const po = await prisma_1.default.purchaseOrder.findFirst({ where: { id: po_id, tenant_id }, include: { po_lines: true } });
            if (po) {
                const allReceived = po.po_lines.every((pol) => {
                    const grnLine = lines.find((l) => l.item_id === pol.item_id);
                    return grnLine && parseFloat(grnLine.quantity_received) >= pol.quantity_ordered;
                });
                if (allReceived) {
                    await prisma_1.default.purchaseOrder.updateMany({ where: { id: po_id, tenant_id }, data: { status: 'received' } });
                }
            }
        }
        res.status(201).json({ success: true, data: grn });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createGRN = createGRN;
const getGRNs = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const grns = await prisma_1.default.grnHeader.findMany({
            where: { tenant_id },
            include: { grn_lines: { include: { item: true } } },
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, data: grns });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getGRNs = getGRNs;
