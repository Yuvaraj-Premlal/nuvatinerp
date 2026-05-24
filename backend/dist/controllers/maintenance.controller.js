"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMaintenanceDashboard = exports.getMTBF_MTTR = exports.createSparePart = exports.getSpareParts = exports.createSchedule = exports.getSchedules = exports.addSpareUsage = exports.updateWorkOrder = exports.createWorkOrder = exports.getWorkOrders = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getWorkOrders = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { status, machine_id, maintenance_type } = req.query;
        const where = { tenant_id };
        if (status)
            where.status = String(status);
        if (machine_id)
            where.machine_id = String(machine_id);
        if (maintenance_type)
            where.maintenance_type = String(maintenance_type);
        const wos = await prisma_1.default.maintenanceWorkOrder.findMany({
            where,
            include: {
                machine: { select: { machine_name: true, machine_code: true } },
                spare_usages: { include: { spare_part: true } }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, data: wos });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getWorkOrders = getWorkOrders;
const createWorkOrder = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const count = await prisma_1.default.maintenanceWorkOrder.count({ where: { tenant_id } });
        const wo_number = `MWO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
        const wo = await prisma_1.default.maintenanceWorkOrder.create({
            data: {
                tenant_id,
                wo_number,
                ...req.body,
                scheduled_date: req.body.scheduled_date ? new Date(req.body.scheduled_date) : null
            },
            include: { machine: { select: { machine_name: true, machine_code: true } } }
        });
        if (req.body.maintenance_type === 'breakdown') {
            await prisma_1.default.systemAlert.create({
                data: {
                    tenant_id,
                    alert_type: 'machine_breakdown',
                    severity: 'critical',
                    message: `Machine breakdown — ${wo.machine?.machine_name}. Work order ${wo_number} raised.`,
                    reference_type: 'maintenance_wo',
                    reference_id: wo.id
                }
            });
        }
        res.status(201).json({ success: true, data: wo });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createWorkOrder = createWorkOrder;
const updateWorkOrder = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = String(req.params.id);
        const { status, findings, action_taken, assigned_to, started_at, completed_at, downtime_minutes, cost } = req.body;
        await prisma_1.default.maintenanceWorkOrder.updateMany({
            where: { id, tenant_id },
            data: {
                status,
                findings,
                action_taken,
                assigned_to,
                started_at: started_at ? new Date(started_at) : undefined,
                completed_at: completed_at ? new Date(completed_at) : undefined,
                downtime_minutes,
                cost
            }
        });
        if (status === 'completed' && req.body.machine_id) {
            const machine = await prisma_1.default.machineMaster.findFirst({
                where: { id: String(req.body.machine_id), tenant_id }
            });
            if (machine) {
                const wo = await prisma_1.default.maintenanceWorkOrder.findFirst({ where: { id, tenant_id } });
                if (wo?.maintenance_type === 'preventive') {
                    const nextPM = new Date();
                    nextPM.setDate(nextPM.getDate() + 30);
                    await prisma_1.default.machineMaster.updateMany({
                        where: { id: String(req.body.machine_id), tenant_id },
                        data: { last_pm_date: new Date(), next_pm_date: nextPM }
                    });
                }
            }
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.updateWorkOrder = updateWorkOrder;
const addSpareUsage = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const wo_id = String(req.params.wo_id);
        const { spare_part_id, quantity_used, unit_cost } = req.body;
        const usage = await prisma_1.default.sparePart_Usage.create({
            data: { tenant_id, wo_id, spare_part_id: String(spare_part_id), quantity_used, unit_cost }
        });
        await prisma_1.default.sparePart.updateMany({
            where: { id: String(spare_part_id), tenant_id },
            data: { quantity_on_hand: { decrement: quantity_used } }
        });
        const spare = await prisma_1.default.sparePart.findFirst({ where: { id: String(spare_part_id), tenant_id } });
        if (spare && spare.quantity_on_hand <= spare.reorder_point) {
            await prisma_1.default.systemAlert.create({
                data: {
                    tenant_id,
                    alert_type: 'spare_part_low',
                    severity: 'warning',
                    message: `Spare part ${spare.part_name} below reorder point. Current stock: ${spare.quantity_on_hand} ${spare.unit_of_measure}`,
                    reference_type: 'spare_part',
                    reference_id: spare.id
                }
            });
        }
        res.status(201).json({ success: true, data: usage });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.addSpareUsage = addSpareUsage;
const getSchedules = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const schedules = await prisma_1.default.maintenanceSchedule.findMany({
            where: { tenant_id },
            include: { machine: { select: { machine_name: true, machine_code: true } } },
            orderBy: { scheduled_date: 'asc' }
        });
        res.json({ success: true, data: schedules });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getSchedules = getSchedules;
const createSchedule = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const schedule = await prisma_1.default.maintenanceSchedule.create({
            data: {
                tenant_id,
                ...req.body,
                scheduled_date: new Date(req.body.scheduled_date),
                next_due_date: req.body.next_due_date ? new Date(req.body.next_due_date) : null
            }
        });
        res.status(201).json({ success: true, data: schedule });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createSchedule = createSchedule;
const getSpareParts = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const spares = await prisma_1.default.sparePart.findMany({
            where: { tenant_id, is_active: true },
            orderBy: { part_name: 'asc' }
        });
        res.json({ success: true, data: spares });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getSpareParts = getSpareParts;
const createSparePart = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const spare = await prisma_1.default.sparePart.create({
            data: { tenant_id, ...req.body }
        });
        res.status(201).json({ success: true, data: spare });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createSparePart = createSparePart;
const getMTBF_MTTR = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const machines = await prisma_1.default.machineMaster.findMany({ where: { tenant_id, is_active: true } });
        const stats = await Promise.all(machines.map(async (machine) => {
            const breakdowns = await prisma_1.default.maintenanceWorkOrder.findMany({
                where: {
                    tenant_id,
                    machine_id: machine.id,
                    maintenance_type: 'breakdown',
                    status: 'completed'
                },
                orderBy: { completed_at: 'asc' }
            });
            const totalRepairTime = breakdowns.reduce((s, wo) => s + (wo.downtime_minutes || 0), 0);
            const mttr = breakdowns.length > 0 ? Math.round(totalRepairTime / breakdowns.length) : 0;
            let mtbf = 0;
            if (breakdowns.length > 1) {
                const intervals = [];
                for (let i = 1; i < breakdowns.length; i++) {
                    const prev = new Date(breakdowns[i - 1].completed_at).getTime();
                    const curr = new Date(breakdowns[i].raised_date).getTime();
                    intervals.push((curr - prev) / 60000);
                }
                mtbf = Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length);
            }
            const lastPM = await prisma_1.default.maintenanceWorkOrder.findFirst({
                where: { tenant_id, machine_id: machine.id, maintenance_type: 'preventive', status: 'completed' },
                orderBy: { completed_at: 'desc' }
            });
            const openWOs = await prisma_1.default.maintenanceWorkOrder.count({
                where: { tenant_id, machine_id: machine.id, status: { in: ['open', 'in_progress'] } }
            });
            return {
                machine_id: machine.id,
                machine_name: machine.machine_name,
                machine_code: machine.machine_code,
                total_breakdowns: breakdowns.length,
                mttr_minutes: mttr,
                mtbf_minutes: mtbf,
                last_pm_date: lastPM?.completed_at || null,
                open_work_orders: openWOs
            };
        }));
        res.json({ success: true, data: stats });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getMTBF_MTTR = getMTBF_MTTR;
const getMaintenanceDashboard = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const today = new Date();
        const openWOs = await prisma_1.default.maintenanceWorkOrder.count({
            where: { tenant_id, status: { in: ['open', 'in_progress'] } }
        });
        const breakdownsThisMonth = await prisma_1.default.maintenanceWorkOrder.count({
            where: {
                tenant_id,
                maintenance_type: 'breakdown',
                raised_date: { gte: new Date(today.getFullYear(), today.getMonth(), 1) }
            }
        });
        const overdueSchedules = await prisma_1.default.maintenanceSchedule.count({
            where: { tenant_id, scheduled_date: { lt: today }, status: 'scheduled' }
        });
        const lowSpares = await prisma_1.default.sparePart.count({
            where: { tenant_id, is_active: true, quantity_on_hand: { lte: 2 } }
        });
        const recentWOs = await prisma_1.default.maintenanceWorkOrder.findMany({
            where: { tenant_id },
            include: { machine: { select: { machine_name: true } } },
            orderBy: { created_at: 'desc' },
            take: 10
        });
        const upcomingPM = await prisma_1.default.maintenanceSchedule.findMany({
            where: {
                tenant_id,
                status: 'scheduled',
                scheduled_date: {
                    gte: today,
                    lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
                }
            },
            include: { machine: { select: { machine_name: true } } },
            orderBy: { scheduled_date: 'asc' }
        });
        res.json({
            success: true,
            data: {
                open_work_orders: openWOs,
                breakdowns_this_month: breakdownsThisMonth,
                overdue_schedules: overdueSchedules,
                low_spare_parts: lowSpares,
                recent_work_orders: recentWOs,
                upcoming_pm: upcomingPM
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getMaintenanceDashboard = getMaintenanceDashboard;
