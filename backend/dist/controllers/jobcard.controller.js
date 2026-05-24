"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDowntime = exports.logShot = exports.updateOperationStatus = exports.updateJobCardStatus = exports.getJobCardById = exports.getJobCards = exports.createJobCard = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createJobCard = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { job_number, item_id, bom_id, routing_id, machine_id, die_id, planned_quantity, shift, planned_date } = req.body;
        const job = await prisma_1.default.jobCard.create({
            data: { tenant_id, job_number, item_id, bom_id, routing_id, machine_id, die_id, planned_quantity, shift, planned_date }
        });
        if (routing_id) {
            const operations = await prisma_1.default.routingOperation.findMany({
                where: { routing_id },
                orderBy: { operation_sequence: 'asc' }
            });
            await prisma_1.default.jobCardOperation.createMany({
                data: operations.map((op) => ({
                    tenant_id,
                    job_id: job.id,
                    operation_id: op.id,
                    operation_sequence: op.operation_sequence,
                    operation_name: op.operation_name,
                    operation_type: op.operation_type,
                    is_outsourced: op.is_outsourced,
                    vendor_id: op.vendor_id,
                    machine_id: op.machine_id,
                    status: 'pending'
                }))
            });
        }
        const jobWithOps = await prisma_1.default.jobCard.findUnique({
            where: { id: job.id },
            include: { job_operations: { orderBy: { operation_sequence: 'asc' } } }
        });
        res.status(201).json({ success: true, data: jobWithOps });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createJobCard = createJobCard;
const getJobCards = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const jobs = await prisma_1.default.jobCard.findMany({
            where: { tenant_id },
            include: { job_operations: { orderBy: { operation_sequence: 'asc' } } },
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, data: jobs });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getJobCards = getJobCards;
const getJobCardById = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = req.params.id;
        const job = await prisma_1.default.jobCard.findFirst({
            where: { id, tenant_id },
            include: {
                job_operations: { orderBy: { operation_sequence: 'asc' } },
                shot_logs: { orderBy: { logged_at: 'desc' }, take: 20 },
                downtime_logs: true,
                material_issues: true,
                rejection_logs: true
            }
        });
        if (!job)
            return res.status(404).json({ success: false, error: 'Job card not found' });
        res.json({ success: true, data: job });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getJobCardById = getJobCardById;
const updateJobCardStatus = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = req.params.id;
        const { status, actual_start, actual_end, actual_quantity_good } = req.body;
        const job = await prisma_1.default.jobCard.updateMany({
            where: { id, tenant_id },
            data: { status, actual_start, actual_end, actual_quantity_good }
        });
        res.json({ success: true, data: job });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.updateJobCardStatus = updateJobCardStatus;
const updateOperationStatus = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const op_id = req.params.op_id;
        const { status, actual_start, actual_end, operator_id, notes } = req.body;
        const op = await prisma_1.default.jobCardOperation.findFirst({ where: { id: op_id, tenant_id } });
        if (!op)
            return res.status(404).json({ success: false, error: 'Operation not found' });
        await prisma_1.default.jobCardOperation.updateMany({
            where: { id: op_id, tenant_id },
            data: { status, actual_start, actual_end, operator_id, notes }
        });
        if (status === 'in_progress' && op.operation_type === 'assembly' && op.job_id) {
            const job = await prisma_1.default.jobCard.findFirst({ where: { id: op.job_id } });
            if (job && job.bom_id) {
                const assemblyComponents = await prisma_1.default.bomLine.findMany({
                    where: { bom_id: job.bom_id, line_type: 'assembly_component' }
                });
                for (const component of assemblyComponents) {
                    const requiredQty = component.quantity_per * job.planned_quantity;
                    await prisma_1.default.materialIssue.create({
                        data: {
                            tenant_id,
                            job_id: job.id,
                            item_id: component.component_item_id,
                            planned_qty: requiredQty,
                            issued_qty: requiredQty,
                            issued_by: operator_id || 'system'
                        }
                    });
                    await prisma_1.default.stockLedger.create({
                        data: {
                            tenant_id,
                            item_id: component.component_item_id,
                            transaction_type: 'issue',
                            quantity: -requiredQty,
                            reference_type: 'job_card',
                            reference_id: job.id
                        }
                    });
                }
            }
        }
        if (status === 'in_progress' && op.is_outsourced && op.vendor_id && op.job_id) {
            const job = await prisma_1.default.jobCard.findFirst({ where: { id: op.job_id } });
            if (job) {
                const existingJWO = await prisma_1.default.jobWorkOrder.findFirst({
                    where: { job_card_id: op.job_id, operation_id: op_id }
                });
                if (!existingJWO) {
                    await prisma_1.default.jobWorkOrder.create({
                        data: {
                            tenant_id,
                            jwo_number: 'JWO-AUTO-' + Date.now(),
                            job_card_id: op.job_id,
                            vendor_id: op.vendor_id,
                            item_id: job.item_id,
                            operation_id: op_id,
                            quantity_sent: job.planned_quantity,
                            status: 'draft'
                        }
                    });
                    await prisma_1.default.systemAlert.create({
                        data: {
                            tenant_id,
                            alert_type: 'job_work_required',
                            severity: 'info',
                            message: 'Job Work Order auto-drafted for operation ' + op.operation_name + ' on job ' + op.job_id,
                            reference_type: 'job_card_operation',
                            reference_id: op_id
                        }
                    });
                }
            }
        }
        res.json({ success: true, data: { message: 'Operation updated' } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.updateOperationStatus = updateOperationStatus;
const logShot = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const job_id = req.params.id;
        const { shot_number, shot_result, rejection_reason, logged_by } = req.body;
        const shot = await prisma_1.default.shotLog.create({
            data: { tenant_id, job_id, shot_number, shot_result, rejection_reason, logged_by }
        });
        if (shot_result === 'good') {
            await prisma_1.default.jobCard.updateMany({
                where: { id: job_id, tenant_id },
                data: { actual_quantity_good: { increment: 1 } }
            });
        }
        const job = await prisma_1.default.jobCard.findFirst({ where: { id: job_id } });
        if (job && job.die_id) {
            await prisma_1.default.dieMaster.updateMany({
                where: { id: job.die_id },
                data: { current_shot_count: { increment: 1 } }
            });
            const die = await prisma_1.default.dieMaster.findUnique({ where: { id: job.die_id } });
            if (die && die.pm_interval_shots) {
                const shotsSinceLastPM = die.current_shot_count - die.shots_at_last_pm;
                if (shotsSinceLastPM >= die.pm_interval_shots * 0.9) {
                    await prisma_1.default.systemAlert.create({
                        data: {
                            tenant_id,
                            alert_type: 'die_pm_due',
                            severity: 'warning',
                            message: 'Die ' + die.die_number + ' approaching PM threshold. Shots since last PM: ' + shotsSinceLastPM,
                            reference_type: 'die_master',
                            reference_id: die.id
                        }
                    });
                }
            }
        }
        res.status(201).json({ success: true, data: shot });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.logShot = logShot;
const logDowntime = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const job_id = req.params.id;
        const { machine_id, start_time, end_time, duration_min, downtime_category, reason_code, reason_detail, logged_by } = req.body;
        const downtime = await prisma_1.default.downtimeLog.create({
            data: { tenant_id, job_id, machine_id, start_time, end_time, duration_min, downtime_category, reason_code, reason_detail, logged_by }
        });
        res.status(201).json({ success: true, data: downtime });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.logDowntime = logDowntime;
