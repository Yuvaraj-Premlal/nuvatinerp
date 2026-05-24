"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRejections = exports.getInspectionsByJob = exports.logRejection = exports.createInspection = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createInspection = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { job_id, inspection_type, inspector_id, result, lines } = req.body;
        const inspection = await prisma_1.default.inspectionHeader.create({
            data: {
                tenant_id, job_id, inspection_type, inspector_id, result,
                inspection_lines: {
                    create: lines.map((l) => ({
                        tenant_id,
                        parameter_name: l.parameter_name,
                        specification_min: l.specification_min,
                        specification_max: l.specification_max,
                        unit: l.unit,
                        actual_value: l.actual_value,
                        result: l.result
                    }))
                }
            },
            include: { inspection_lines: true }
        });
        res.status(201).json({ success: true, data: inspection });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createInspection = createInspection;
const logRejection = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { job_id, item_id, inspection_id, quantity_rejected, rejection_stage, defect_code, defect_description, die_id, machine_id, alloy_lot, disposition, logged_by } = req.body;
        const rejection = await prisma_1.default.rejectionLog.create({
            data: { tenant_id, job_id, item_id, inspection_id, quantity_rejected, rejection_stage, defect_code, defect_description, die_id, machine_id, alloy_lot, disposition, logged_by }
        });
        res.status(201).json({ success: true, data: rejection });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.logRejection = logRejection;
const getInspectionsByJob = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const job_id = req.params.job_id;
        const inspections = await prisma_1.default.inspectionHeader.findMany({
            where: { tenant_id, job_id },
            include: { inspection_lines: true, rejection_logs: true }
        });
        res.json({ success: true, data: inspections });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getInspectionsByJob = getInspectionsByJob;
const getRejections = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const rejections = await prisma_1.default.rejectionLog.findMany({
            where: { tenant_id },
            orderBy: { logged_at: 'desc' },
            take: 50
        });
        res.json({ success: true, data: rejections });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getRejections = getRejections;
