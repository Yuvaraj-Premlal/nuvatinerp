"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFactoryStatus = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getFactoryStatus = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        const machines = await prisma_1.default.machineMaster.findMany({
            where: { tenant_id, is_active: true }
        });
        const machineStatus = await Promise.all(machines.map(async (machine) => {
            const activeJob = await prisma_1.default.jobCard.findFirst({
                where: { tenant_id, machine_id: machine.id, status: 'in_progress' },
                include: {
                    job_operations: { orderBy: { operation_sequence: 'asc' } },
                    shot_logs: { orderBy: { logged_at: 'desc' }, take: 1 }
                }
            });
            const todayJobs = await prisma_1.default.jobCard.findMany({
                where: { tenant_id, machine_id: machine.id, planned_date: { gte: startOfDay, lte: endOfDay } },
                include: { shot_logs: true, downtime_logs: true }
            });
            const totalShots = todayJobs.reduce((sum, j) => sum + j.shot_logs.length, 0);
            const goodShots = todayJobs.reduce((sum, j) => sum + j.actual_quantity_good, 0);
            const totalDowntime = todayJobs.reduce((sum, j) => sum + j.downtime_logs.reduce((s, d) => s + (d.duration_min || 0), 0), 0);
            const shiftMin = 480;
            const avail = (shiftMin - totalDowntime) / shiftMin;
            const cycleTime = machine.rated_cycle_time_sec ?? 48;
            const theoretical = ((shiftMin - totalDowntime) * 60) / cycleTime;
            const perf = theoretical > 0 ? Math.min(totalShots / theoretical, 1) : 0;
            const qual = totalShots > 0 ? goodShots / totalShots : 0;
            const oee = Math.round(avail * perf * qual * 100);
            return {
                machine_id: machine.id,
                machine_code: machine.machine_code,
                machine_name: machine.machine_name,
                machine_type: machine.machine_type,
                is_constraint: machine.is_constraint,
                status: activeJob ? 'in_production' : 'idle',
                current_job: activeJob ? {
                    job_number: activeJob.job_number,
                    planned_quantity: activeJob.planned_quantity,
                    actual_quantity_good: activeJob.actual_quantity_good,
                    progress_percent: Math.round((activeJob.actual_quantity_good / activeJob.planned_quantity) * 100),
                    current_operation: activeJob.job_operations.find((op) => op.status === 'in_progress')?.operation_name,
                    last_shot_at: activeJob.shot_logs[0]?.logged_at
                } : null,
                today_oee: oee,
                oee_target: machine.oee_target_percent,
                oee_status: oee >= (machine.oee_target_percent ?? 78) ? 'on_target' : 'below_target',
                today_shots: totalShots,
                today_good: goodShots,
                today_downtime_min: totalDowntime
            };
        }));
        const dies = await prisma_1.default.dieMaster.findMany({
            where: { tenant_id, is_active: true, current_status: 'in_production' }
        });
        const dieStatus = dies.map((die) => {
            const shotsSinceLastPM = die.current_shot_count - die.shots_at_last_pm;
            const pmInterval = die.pm_interval_shots ?? 20000;
            const shotsToNextPM = pmInterval - shotsSinceLastPM;
            const pmPercent = Math.round((shotsSinceLastPM / pmInterval) * 100);
            return {
                die_id: die.id,
                die_number: die.die_number,
                die_name: die.die_name,
                current_shot_count: die.current_shot_count,
                shots_to_pm: shotsToNextPM,
                pm_percent: pmPercent,
                pm_status: pmPercent >= 90 ? 'critical' : pmPercent >= 75 ? 'warning' : 'healthy',
                design_life_remaining: die.design_life_shots
                    ? Math.round(((die.design_life_shots - die.current_shot_count) / die.design_life_shots) * 100)
                    : null
            };
        });
        const stockItems = await prisma_1.default.itemMaster.findMany({
            where: { tenant_id, is_active: true },
            include: { pfep_detail: true }
        });
        const stockLedger = await prisma_1.default.stockLedger.groupBy({
            by: ['item_id'],
            where: { tenant_id },
            _sum: { quantity: true }
        });
        const materialStatus = stockItems.map((item) => {
            const ledger = stockLedger.find((l) => l.item_id === item.id);
            const onHand = ledger?._sum?.quantity ?? 0;
            const reorderPoint = item.pfep_detail?.reorder_point ?? 0;
            const safetyStock = item.pfep_detail?.safety_stock ?? 0;
            const zone = onHand <= safetyStock ? 'red' : onHand <= reorderPoint ? 'yellow' : 'green';
            return {
                item_id: item.id,
                item_code: item.item_code,
                item_name: item.item_name,
                item_type: item.item_type,
                quantity_on_hand: onHand,
                unit_of_measure: item.unit_of_measure,
                reorder_point: reorderPoint,
                safety_stock: safetyStock,
                zone,
                storage_location: item.pfep_detail?.storage_location
            };
        });
        const activeJobCards = await prisma_1.default.jobCard.findMany({
            where: { tenant_id, status: { in: ['planned', 'released', 'in_progress'] } },
            include: { job_operations: { orderBy: { operation_sequence: 'asc' } } },
            orderBy: { planned_date: 'asc' }
        });
        const jobFlow = activeJobCards.map((job) => {
            const currentOp = job.job_operations.find((op) => op.status === 'in_progress');
            const completedOps = job.job_operations.filter((op) => op.status === 'completed').length;
            const totalOps = job.job_operations.length;
            return {
                job_id: job.id,
                job_number: job.job_number,
                status: job.status,
                planned_quantity: job.planned_quantity,
                actual_quantity_good: job.actual_quantity_good,
                current_operation: currentOp?.operation_name ?? 'Not started',
                current_operation_type: currentOp?.operation_type,
                progress_percent: totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0,
                operations: job.job_operations.map((op) => ({
                    sequence: op.operation_sequence,
                    name: op.operation_name,
                    type: op.operation_type,
                    status: op.status,
                    is_outsourced: op.is_outsourced
                }))
            };
        });
        const dispatchToday = await prisma_1.default.salesOrder.findMany({
            where: { tenant_id, delivery_date: { gte: startOfDay, lte: endOfDay }, status: 'open' },
            include: { so_lines: { include: { item: true } } }
        });
        const alerts = await prisma_1.default.systemAlert.findMany({
            where: { tenant_id, is_resolved: false },
            orderBy: [{ severity: 'desc' }, { created_at: 'desc' }],
            take: 20
        });
        const constraint = await prisma_1.default.machineMaster.findFirst({
            where: { tenant_id, is_constraint: true }
        });
        const latestBuffer = constraint ? await prisma_1.default.bufferLog.findFirst({
            where: { tenant_id, machine_id: constraint.id },
            orderBy: { logged_at: 'desc' }
        }) : null;
        res.json({
            success: true,
            data: {
                timestamp: new Date(),
                factory_summary: {
                    machines_total: machines.length,
                    machines_in_production: machineStatus.filter((m) => m.status === 'in_production').length,
                    machines_idle: machineStatus.filter((m) => m.status === 'idle').length,
                    active_jobs: activeJobCards.length,
                    alerts_unresolved: alerts.length,
                    dispatch_due_today: dispatchToday.length
                },
                constraint: constraint ? {
                    machine_name: constraint.machine_name,
                    buffer_hours: latestBuffer?.buffer_hours,
                    buffer_target: latestBuffer?.buffer_target_hours,
                    buffer_status: latestBuffer?.buffer_status ?? 'unknown'
                } : null,
                machines: machineStatus,
                dies: dieStatus,
                materials: materialStatus,
                job_flow: jobFlow,
                dispatch_due_today: dispatchToday.map((so) => ({
                    so_number: so.so_number,
                    customer_name: so.customer_name,
                    delivery_date: so.delivery_date,
                    lines: so.so_lines.map((l) => ({
                        item_name: l.item.item_name,
                        quantity_ordered: l.quantity_ordered,
                        quantity_dispatched: l.quantity_dispatched
                    }))
                })),
                alerts: alerts.map((a) => ({
                    alert_type: a.alert_type,
                    severity: a.severity,
                    message: a.message,
                    created_at: a.created_at
                }))
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getFactoryStatus = getFactoryStatus;
