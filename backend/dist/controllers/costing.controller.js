"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobCardCost = exports.setCostConfig = exports.getCostConfig = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getCostConfig = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const configs = await prisma_1.default.costConfig.findMany({ where: { tenant_id } });
        res.json({ success: true, data: configs });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getCostConfig = getCostConfig;
const setCostConfig = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { config_key, config_value, description } = req.body;
        const config = await prisma_1.default.costConfig.upsert({
            where: { tenant_id_config_key: { tenant_id, config_key } },
            update: { config_value, description },
            create: { tenant_id, config_key, config_value, description }
        });
        res.json({ success: true, data: config });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.setCostConfig = setCostConfig;
const getJobCardCost = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const job_id = req.params.job_id;
        const job = await prisma_1.default.jobCard.findFirst({
            where: { id: job_id, tenant_id },
            include: {
                job_operations: true,
                material_issues: { include: { item: true } },
                rejection_logs: true
            }
        });
        if (!job)
            return res.status(404).json({ success: false, error: 'Job card not found' });
        const configs = await prisma_1.default.costConfig.findMany({ where: { tenant_id } });
        const getConfig = (key) => configs.find((c) => c.config_key === key)?.config_value ?? 0;
        const energyRate = getConfig('energy_rate_per_kwh');
        const operatorRate = getConfig('operator_rate_per_shift');
        const scrapRate = getConfig('scrap_rate_per_kg');
        let materialCost = 0;
        let consumableCost = 0;
        for (const issue of job.material_issues) {
            const avgCost = await prisma_1.default.stockLedger.aggregate({
                where: { tenant_id, item_id: issue.item_id, transaction_type: 'receipt' },
                _avg: { unit_cost: true }
            });
            const unitCost = avgCost._avg.unit_cost ?? 0;
            if (issue.item.item_type === 'raw_material') {
                materialCost += issue.issued_qty * unitCost;
            }
            else {
                consumableCost += issue.issued_qty * unitCost;
            }
        }
        let energyCost = 0;
        let labourCost = 0;
        for (const op of job.job_operations) {
            if (op.machine_id) {
                const machine = await prisma_1.default.machineMaster.findUnique({ where: { id: op.machine_id } });
                if (machine) {
                    const cycleTimeSec = machine.rated_cycle_time_sec ?? 48;
                    const durationHrs = (job.planned_quantity * cycleTimeSec) / 3600;
                    const powerKw = machine.power_kw ?? 0;
                    energyCost += powerKw * durationHrs * energyRate;
                    const operators = op.operators_required ?? machine.operators_required ?? 1;
                    labourCost += operators * operatorRate * (durationHrs / 8);
                }
            }
        }
        const jwReceipts = await prisma_1.default.jobWorkReceipt.findMany({
            where: { jwo: { job_card_id: job_id } }
        });
        const jobWorkCost = jwReceipts.reduce((sum, r) => sum + (r.job_work_charge_billed ?? 0), 0);
        const item = job.item_id ? await prisma_1.default.itemMaster.findUnique({
            where: { id: job.item_id },
            include: { pfep_detail: true }
        }) : null;
        let scrapRecovery = 0;
        if (item && item.pfep_detail) {
            const grossWt = item.pfep_detail.gross_weight_kg ?? 0;
            const netWt = item.pfep_detail.net_weight_kg ?? 0;
            scrapRecovery = (grossWt - netWt) * job.actual_quantity_good * scrapRate;
        }
        const totalVariableCost = materialCost + consumableCost + energyCost + labourCost + jobWorkCost - scrapRecovery;
        const goodParts = job.actual_quantity_good || 1;
        const variableCostPerPart = totalVariableCost / goodParts;
        const sellingPrice = item?.selling_price ?? 0;
        const throughputPerPart = sellingPrice - variableCostPerPart;
        const totalThroughput = throughputPerPart * goodParts;
        const rejectionCost = job.rejection_logs.length * variableCostPerPart;
        res.json({
            success: true,
            disclaimer: 'Variable cost only. Excludes depreciation, rent, and admin overhead.',
            data: {
                job_number: job.job_number,
                good_parts_produced: goodParts,
                cost_breakdown: {
                    material_cost: Math.round(materialCost * 100) / 100,
                    consumable_cost: Math.round(consumableCost * 100) / 100,
                    energy_cost: Math.round(energyCost * 100) / 100,
                    labour_cost: Math.round(labourCost * 100) / 100,
                    job_work_cost: Math.round(jobWorkCost * 100) / 100,
                    scrap_recovery: Math.round(scrapRecovery * 100) / 100,
                    total_variable_cost: Math.round(totalVariableCost * 100) / 100
                },
                per_part: {
                    variable_cost: Math.round(variableCostPerPart * 100) / 100,
                    selling_price: sellingPrice,
                    throughput: Math.round(throughputPerPart * 100) / 100,
                    throughput_percent: sellingPrice > 0 ? Math.round((throughputPerPart / sellingPrice) * 100) : 0
                },
                total_throughput: Math.round(totalThroughput * 100) / 100,
                rejection_cost: Math.round(rejectionCost * 100) / 100
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getJobCardCost = getJobCardCost;
