"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMachine = exports.getMachines = exports.createMachine = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createMachine = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { machine_code, machine_name, machine_type, capacity_tons, rated_cycle_time_sec, rated_shots_per_shift, is_constraint, oee_target_percent, location } = req.body;
        const machine = await prisma_1.default.machineMaster.create({
            data: { tenant_id, machine_code, machine_name, machine_type, capacity_tons, rated_cycle_time_sec, rated_shots_per_shift, is_constraint, oee_target_percent, location }
        });
        res.status(201).json({ success: true, data: machine });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createMachine = createMachine;
const getMachines = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const machines = await prisma_1.default.machineMaster.findMany({
            where: { tenant_id, is_active: true }
        });
        res.json({ success: true, data: machines });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getMachines = getMachines;
const updateMachine = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = req.params.id;
        const { is_constraint, oee_target_percent, rated_cycle_time_sec } = req.body;
        const machine = await prisma_1.default.machineMaster.updateMany({
            where: { id, tenant_id },
            data: { is_constraint, oee_target_percent, rated_cycle_time_sec }
        });
        res.json({ success: true, data: machine });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.updateMachine = updateMachine;
