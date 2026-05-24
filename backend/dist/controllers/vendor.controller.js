"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobWorkOrders = exports.createJobWorkReceipt = exports.createJobWorkOrder = exports.getVendors = exports.createVendor = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createVendor = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { vendor_code, vendor_name, address, gstin, operation_types, payment_terms, lead_time_days } = req.body;
        const vendor = await prisma_1.default.vendorMaster.create({
            data: { tenant_id, vendor_code, vendor_name, address, gstin, operation_types, payment_terms, lead_time_days }
        });
        res.status(201).json({ success: true, data: vendor });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createVendor = createVendor;
const getVendors = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const vendors = await prisma_1.default.vendorMaster.findMany({
            where: { tenant_id, is_active: true }
        });
        res.json({ success: true, data: vendors });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getVendors = getVendors;
const createJobWorkOrder = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { jwo_number, job_card_id, vendor_id, item_id, operation_id, quantity_sent, outward_challan, expected_return_date, job_work_charge } = req.body;
        const jwo = await prisma_1.default.jobWorkOrder.create({
            data: { tenant_id, jwo_number, job_card_id, vendor_id, item_id, operation_id, quantity_sent, outward_challan, expected_return_date, job_work_charge, status: 'sent' }
        });
        await prisma_1.default.stockLedger.create({
            data: { tenant_id, item_id, transaction_type: 'sent_to_vendor', quantity: -quantity_sent, reference_type: 'job_work_order', reference_id: jwo.id, location: 'at_vendor' }
        });
        res.status(201).json({ success: true, data: jwo });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createJobWorkOrder = createJobWorkOrder;
const createJobWorkReceipt = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { jwr_number, jwo_id, quantity_received, accepted_qty, rejected_qty, rejection_reason, inward_challan, job_work_charge_billed, received_by } = req.body;
        const jwo = await prisma_1.default.jobWorkOrder.findUnique({ where: { id: jwo_id } });
        const jwr = await prisma_1.default.jobWorkReceipt.create({
            data: { tenant_id, jwr_number, jwo_id, quantity_received, accepted_qty, rejected_qty, rejection_reason, inward_challan, job_work_charge_billed, received_by }
        });
        if (jwo && accepted_qty) {
            await prisma_1.default.stockLedger.create({
                data: { tenant_id, item_id: jwo.item_id, transaction_type: 'received_from_vendor', quantity: accepted_qty, reference_type: 'job_work_receipt', reference_id: jwr.id, location: 'in_house' }
            });
        }
        await prisma_1.default.jobWorkOrder.update({
            where: { id: jwo_id },
            data: { status: 'completed' }
        });
        res.status(201).json({ success: true, data: jwr });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createJobWorkReceipt = createJobWorkReceipt;
const getJobWorkOrders = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const orders = await prisma_1.default.jobWorkOrder.findMany({
            where: { tenant_id },
            include: { vendor: true, receipts: true },
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, data: orders });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getJobWorkOrders = getJobWorkOrders;
