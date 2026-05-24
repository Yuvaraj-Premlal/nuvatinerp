"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupplierById = exports.getSuppliers = exports.createSupplier = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createSupplier = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { supplier_code, supplier_name, address, gstin, payment_terms, lead_time_days, moq, currency } = req.body;
        const supplier = await prisma_1.default.supplierMaster.create({
            data: { tenant_id, supplier_code, supplier_name, address, gstin, payment_terms, lead_time_days, moq, currency }
        });
        res.status(201).json({ success: true, data: supplier });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createSupplier = createSupplier;
const getSuppliers = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const suppliers = await prisma_1.default.supplierMaster.findMany({
            where: { tenant_id, is_active: true }
        });
        res.json({ success: true, data: suppliers });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getSuppliers = getSuppliers;
const getSupplierById = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = req.params.id;
        const supplier = await prisma_1.default.supplierMaster.findFirst({
            where: { id, tenant_id },
            include: { item_suppliers: { include: { item: true } } }
        });
        res.json({ success: true, data: supplier });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getSupplierById = getSupplierById;
