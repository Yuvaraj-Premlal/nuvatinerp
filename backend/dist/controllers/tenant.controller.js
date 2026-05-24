"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantById = exports.getTenants = exports.createTenant = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createTenant = async (req, res) => {
    try {
        const { name, code, industry, address, gstin } = req.body;
        const tenant = await prisma_1.default.tenant.create({
            data: { name, code, industry, address, gstin }
        });
        res.status(201).json({ success: true, data: tenant });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createTenant = createTenant;
const getTenants = async (req, res) => {
    try {
        const tenants = await prisma_1.default.tenant.findMany({
            where: { is_active: true }
        });
        res.json({ success: true, data: tenants });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getTenants = getTenants;
const getTenantById = async (req, res) => {
    try {
        const id = req.params.id;
        const tenant = await prisma_1.default.tenant.findUnique({
            where: { id }
        });
        if (!tenant) {
            return res.status(404).json({ success: false, error: 'Tenant not found' });
        }
        res.json({ success: true, data: tenant });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getTenantById = getTenantById;
