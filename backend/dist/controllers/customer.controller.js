"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomers = exports.createCustomer = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createCustomer = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { customer_code, customer_name, address, gstin, contact_person, contact_phone, payment_terms } = req.body;
        const customer = await prisma_1.default.customerMaster.create({
            data: { tenant_id, customer_code, customer_name, address, gstin, contact_person, contact_phone, payment_terms }
        });
        res.status(201).json({ success: true, data: customer });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createCustomer = createCustomer;
const getCustomers = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const customers = await prisma_1.default.customerMaster.findMany({
            where: { tenant_id, is_active: true }
        });
        res.json({ success: true, data: customers });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getCustomers = getCustomers;
