"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPfepByItem = exports.createOrUpdatePfep = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createOrUpdatePfep = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const item_id = req.params.item_id;
        const { gross_weight_kg, net_weight_kg, yield_percent, storage_location, rack_address, zone, reorder_point, safety_stock, order_quantity, shelf_life_days, abc_classification, constraint_flag } = req.body;
        const pfep = await prisma_1.default.itemPfepDetail.upsert({
            where: { item_id },
            create: { tenant_id, item_id, gross_weight_kg, net_weight_kg, yield_percent, storage_location, rack_address, zone, reorder_point, safety_stock, order_quantity, shelf_life_days, abc_classification, constraint_flag },
            update: { gross_weight_kg, net_weight_kg, yield_percent, storage_location, rack_address, zone, reorder_point, safety_stock, order_quantity, shelf_life_days, abc_classification, constraint_flag }
        });
        res.json({ success: true, data: pfep });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createOrUpdatePfep = createOrUpdatePfep;
const getPfepByItem = async (req, res) => {
    try {
        const item_id = req.params.item_id;
        const pfep = await prisma_1.default.itemPfepDetail.findUnique({
            where: { item_id },
            include: { item: true }
        });
        res.json({ success: true, data: pfep });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getPfepByItem = getPfepByItem;
