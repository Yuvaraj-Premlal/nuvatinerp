"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoutingByItem = exports.createRouting = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createRouting = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { item_id, routing_revision, effective_date, status, operations } = req.body;
        const routing = await prisma_1.default.routingHeader.create({
            data: {
                tenant_id, item_id, routing_revision, effective_date, status,
                operations: {
                    create: operations.map((op) => ({
                        tenant_id,
                        operation_sequence: op.operation_sequence,
                        operation_name: op.operation_name,
                        machine_id: op.machine_id,
                        standard_time_sec: op.standard_time_sec,
                        setup_time_min: op.setup_time_min,
                        is_constraint: op.is_constraint,
                        is_pre_constraint_inspection: op.is_pre_constraint_inspection
                    }))
                }
            },
            include: { operations: true }
        });
        res.status(201).json({ success: true, data: routing });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createRouting = createRouting;
const getRoutingByItem = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const item_id = req.params.item_id;
        const routing = await prisma_1.default.routingHeader.findMany({
            where: { tenant_id, item_id },
            include: { operations: { include: { machine: true }, orderBy: { operation_sequence: 'asc' } } }
        });
        res.json({ success: true, data: routing });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getRoutingByItem = getRoutingByItem;
