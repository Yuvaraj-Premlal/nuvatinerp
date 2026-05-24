"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalesOrderById = exports.getDispatchById = exports.getDispatches = exports.createDispatch = exports.getSalesOrders = exports.createSalesOrder = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createSalesOrder = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { so_number, customer_name, customer_id, delivery_date, lines } = req.body;
        const so = await prisma_1.default.salesOrder.create({
            data: {
                tenant_id, so_number, customer_name, customer_id, delivery_date,
                so_lines: {
                    create: lines.map((l) => ({
                        tenant_id,
                        item_id: l.item_id,
                        quantity_ordered: l.quantity_ordered,
                        unit_price: l.unit_price,
                        uom: l.uom
                    }))
                }
            },
            include: { so_lines: true }
        });
        res.status(201).json({ success: true, data: so });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createSalesOrder = createSalesOrder;
const getSalesOrders = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const orders = await prisma_1.default.salesOrder.findMany({
            where: { tenant_id },
            include: { so_lines: { include: { item: true } } },
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, data: orders });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getSalesOrders = getSalesOrders;
const createDispatch = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { dispatch_number, so_id, dispatched_by, vehicle_number, transporter, challan_number, lines } = req.body;
        const dispatch = await prisma_1.default.dispatchHeader.create({
            data: {
                tenant_id, dispatch_number, so_id, dispatched_by, vehicle_number, transporter, challan_number, status: 'confirmed',
                dispatch_lines: {
                    create: lines.map((l) => ({
                        tenant_id,
                        item_id: l.item_id,
                        so_line_id: l.so_line_id,
                        quantity_dispatched: l.quantity_dispatched,
                        batch_number: l.batch_number,
                        pack_count: l.pack_count,
                        pieces_per_pack: l.pieces_per_pack
                    }))
                }
            },
            include: { dispatch_lines: true }
        });
        for (const line of lines) {
            await prisma_1.default.stockLedger.create({
                data: {
                    tenant_id,
                    item_id: line.item_id,
                    transaction_type: 'dispatch',
                    quantity: -line.quantity_dispatched,
                    reference_type: 'dispatch',
                    reference_id: dispatch.id
                }
            });
        }
        res.status(201).json({ success: true, data: dispatch });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createDispatch = createDispatch;
const getDispatches = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const dispatches = await prisma_1.default.dispatchHeader.findMany({
            where: { tenant_id },
            include: { dispatch_lines: { include: { item: true } } },
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, data: dispatches });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getDispatches = getDispatches;
const getDispatchById = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = String(req.params.id);
        const dispatch = await prisma_1.default.dispatchHeader.findFirst({
            where: { id, tenant_id },
            include: {
                dispatch_lines: {
                    include: { item: true }
                }
            }
        });
        if (!dispatch)
            return res.status(404).json({ success: false, error: 'Dispatch not found' });
        res.json({ success: true, data: dispatch });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getDispatchById = getDispatchById;
const getSalesOrderById = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = String(req.params.id);
        const so = await prisma_1.default.salesOrder.findFirst({
            where: { id, tenant_id },
            include: { so_lines: true }
        });
        if (!so)
            return res.status(404).json({ success: false, error: 'Sales order not found' });
        res.json({ success: true, data: so });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getSalesOrderById = getSalesOrderById;
