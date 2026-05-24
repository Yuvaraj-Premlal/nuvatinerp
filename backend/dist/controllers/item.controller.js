"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateItem = exports.getItemById = exports.getItems = exports.createItem = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createItem = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { item_code, item_name, item_type, unit_of_measure, item_category, description } = req.body;
        const item = await prisma_1.default.itemMaster.create({
            data: { tenant_id, item_code, item_name, item_type, unit_of_measure, item_category, description }
        });
        res.status(201).json({ success: true, data: item });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createItem = createItem;
const getItems = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { item_type } = req.query;
        const items = await prisma_1.default.itemMaster.findMany({
            where: {
                tenant_id,
                is_active: true,
                ...(item_type ? { item_type: item_type } : {})
            },
            include: { pfep_detail: true }
        });
        res.json({ success: true, data: items });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getItems = getItems;
const getItemById = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = req.params.id;
        const item = await prisma_1.default.itemMaster.findFirst({
            where: { id, tenant_id },
            include: {
                pfep_detail: true,
                item_suppliers: { include: { supplier: true } }
            }
        });
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }
        res.json({ success: true, data: item });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getItemById = getItemById;
const updateItem = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = req.params.id;
        const { item_name, item_category, description, is_active } = req.body;
        const item = await prisma_1.default.itemMaster.updateMany({
            where: { id, tenant_id },
            data: { item_name, item_category, description, is_active }
        });
        res.json({ success: true, data: item });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.updateItem = updateItem;
