"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBomByItem = exports.createBom = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createBom = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { item_id, bom_revision, effective_date, status, lines } = req.body;
        const bom = await prisma_1.default.bomHeader.create({
            data: {
                tenant_id, item_id, bom_revision, effective_date, status,
                bom_lines: {
                    create: lines.map((l) => ({
                        tenant_id,
                        component_item_id: l.component_item_id,
                        quantity_per: l.quantity_per,
                        unit_of_measure: l.unit_of_measure,
                        yield_factor: l.yield_factor,
                        scrap_percent: l.scrap_percent,
                        line_type: l.line_type
                    }))
                }
            },
            include: { bom_lines: true }
        });
        res.status(201).json({ success: true, data: bom });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createBom = createBom;
const getBomByItem = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const item_id = req.params.item_id;
        const bom = await prisma_1.default.bomHeader.findMany({
            where: { tenant_id, item_id },
            include: { bom_lines: { include: { component_item: true } } }
        });
        res.json({ success: true, data: bom });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getBomByItem = getBomByItem;
