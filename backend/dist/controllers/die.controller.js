"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDieStatus = exports.getDieById = exports.getDies = exports.createDie = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createDie = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { die_number, die_name, item_id, cavity_count, design_life_shots, current_shot_count, pm_interval_shots, die_owner, customer_id, current_status, repair_vendor, repair_lead_time_days, machine_id, location } = req.body;
        const die = await prisma_1.default.dieMaster.create({
            data: { tenant_id, die_number, die_name, item_id, cavity_count, design_life_shots, current_shot_count, pm_interval_shots, die_owner, customer_id, current_status, repair_vendor, repair_lead_time_days, machine_id, location }
        });
        res.status(201).json({ success: true, data: die });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createDie = createDie;
const getDies = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const dies = await prisma_1.default.dieMaster.findMany({
            where: { tenant_id, is_active: true },
            include: { machine: true }
        });
        res.json({ success: true, data: dies });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getDies = getDies;
const getDieById = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = req.params.id;
        const die = await prisma_1.default.dieMaster.findFirst({
            where: { id, tenant_id },
            include: { machine: true, die_shot_logs: { orderBy: { logged_at: 'desc' }, take: 10 } }
        });
        res.json({ success: true, data: die });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getDieById = getDieById;
const updateDieStatus = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = req.params.id;
        const { current_status, current_shot_count, shots_at_last_pm } = req.body;
        const die = await prisma_1.default.dieMaster.updateMany({
            where: { id, tenant_id },
            data: { current_status, current_shot_count, shots_at_last_pm }
        });
        res.json({ success: true, data: die });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.updateDieStatus = updateDieStatus;
