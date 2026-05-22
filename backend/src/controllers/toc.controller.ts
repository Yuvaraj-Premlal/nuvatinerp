import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const detectConstraint = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;

    const machines = await prisma.machineMaster.findMany({
      where: { tenant_id, is_active: true }
    });

    const machineLoads = await Promise.all(
      machines.map(async (machine: any) => {
        const ops = await prisma.jobCardOperation.findMany({
          where: {
            tenant_id,
            machine_id: machine.id,
            status: { in: ['pending', 'in_progress'] }
          },
          include: { job: true }
        });

        const totalWorkSec = ops.reduce((sum: number, op: any) => {
          const cycleTime = machine.rated_cycle_time_sec ?? 48;
          return sum + (op.job.planned_quantity * cycleTime);
        }, 0);

        const availableSecPerDay = 8 * 3600;
        const availableSecPerWeek = availableSecPerDay * 5;
        const loadPercent = availableSecPerWeek > 0
          ? Math.round((totalWorkSec / availableSecPerWeek) * 100)
          : 0;

        return {
          machine_id: machine.id,
          machine_code: machine.machine_code,
          machine_name: machine.machine_name,
          total_work_hours: Math.round(totalWorkSec / 3600 * 10) / 10,
          available_hours_per_week: Math.round(availableSecPerWeek / 3600),
          load_percent: loadPercent,
          active_jobs: ops.length,
          is_current_constraint: machine.is_constraint
        };
      })
    );

    machineLoads.sort((a: any, b: any) => b.load_percent - a.load_percent);
    const detectedConstraint = machineLoads[0];

    res.json({
      success: true,
      data: {
        detected_constraint: detectedConstraint,
        all_machines: machineLoads,
        recommendation: detectedConstraint
          ? detectedConstraint.machine_name + ' is the constraint at ' + detectedConstraint.load_percent + '% load'
          : 'No machines loaded'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const setConstraintConfig = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { machine_id, buffer_target_hours, effective_from } = req.body;

    await prisma.constraintConfig.updateMany({
      where: { tenant_id, is_active_constraint: true },
      data: { is_active_constraint: false, effective_to: new Date() }
    });

    const config = await prisma.constraintConfig.create({
      data: { tenant_id, machine_id, is_active_constraint: true, buffer_target_hours, effective_from }
    });

    await prisma.machineMaster.updateMany({
      where: { tenant_id },
      data: { is_constraint: false }
    });

    await prisma.machineMaster.updateMany({
      where: { id: machine_id, tenant_id },
      data: { is_constraint: true }
    });

    res.status(201).json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getConstraintConfig = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const config = await prisma.constraintConfig.findFirst({
      where: { tenant_id, is_active_constraint: true },
      include: { machine: true }
    });
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPriorityQueue = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;

    const constraint = await prisma.machineMaster.findFirst({
      where: { tenant_id, is_constraint: true }
    });

    if (!constraint) {
      return res.json({ success: true, data: { constraint: null, queue: [] } });
    }

    const activeJobs = await prisma.jobCard.findMany({
      where: {
        tenant_id,
        status: { in: ['planned', 'released', 'in_progress'] }
      },
      include: {
        job_operations: { orderBy: { operation_sequence: 'asc' } }
      }
    });

    const queue = await Promise.all(
      activeJobs.map(async (job: any) => {
        const constraintOp = job.job_operations.find(
          (op: any) => op.machine_id === constraint.id && !op.is_outsourced
        );
        if (!constraintOp) return null;

        const completedOps = job.job_operations.filter((op: any) => op.status === 'completed').length;
        const totalOps = job.job_operations.length;

        let throughputPerConstraintHour = null;
        if (job.item_id) {
          const item = await prisma.itemMaster.findUnique({ where: { id: job.item_id } });
          if (item && item.selling_price && item.material_cost) {
            const throughputPerPiece = item.selling_price - item.material_cost;
            const constraintTimeSec = constraint.rated_cycle_time_sec ?? 48;
            const constraintTimeHrs = constraintTimeSec / 3600;
            throughputPerConstraintHour = Math.round(throughputPerPiece / constraintTimeHrs);
          }
        }

        return {
          job_id: job.id,
          job_number: job.job_number,
          item_id: job.item_id,
          planned_quantity: job.planned_quantity,
          status: job.status,
          constraint_operation: constraintOp.operation_name,
          constraint_op_status: constraintOp.status,
          progress_percent: totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0,
          throughput_per_constraint_hour: throughputPerConstraintHour,
          shift: job.shift,
          planned_date: job.planned_date
        };
      })
    );

    const filteredQueue = queue
      .filter((j: any) => j !== null)
      .sort((a: any, b: any) => {
        if (a.throughput_per_constraint_hour && b.throughput_per_constraint_hour) {
          return b.throughput_per_constraint_hour - a.throughput_per_constraint_hour;
        }
        return 0;
      });

    res.json({
      success: true,
      data: {
        constraint_machine: constraint.machine_name,
        constraint_oee_target: constraint.oee_target_percent,
        total_jobs_queued: filteredQueue.length,
        queue: filteredQueue
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getBufferStatus = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;

    const config = await prisma.constraintConfig.findFirst({
      where: { tenant_id, is_active_constraint: true },
      include: { machine: true }
    });

    if (!config) {
      return res.json({ success: true, data: { status: 'no_constraint_configured' } });
    }

    const activeJobs = await prisma.jobCard.findMany({
      where: { tenant_id, status: { in: ['in_progress', 'released'] } },
      include: { job_operations: { orderBy: { operation_sequence: 'asc' } } }
    });

    let readyForConstraint = 0;
    const blockedJobs: any[] = [];

    for (const job of activeJobs) {
      const ops = job.job_operations;
      const constraintOpIndex = ops.findIndex((op: any) => op.machine_id === config.machine_id);
      if (constraintOpIndex <= 0) continue;

      const opsBeforeConstraint = ops.slice(0, constraintOpIndex);
      const allCompleted = opsBeforeConstraint.every((op: any) => op.status === 'completed');

      if (allCompleted) {
        const machine = await prisma.machineMaster.findFirst({ where: { id: config.machine_id } });
        const cycleTimeSec = machine?.rated_cycle_time_sec ?? 48;
        const hoursNeeded = (job.planned_quantity * cycleTimeSec) / 3600;
        readyForConstraint += hoursNeeded;
      } else {
        const pendingOp = opsBeforeConstraint.find((op: any) => op.status !== 'completed');
        if (pendingOp) {
          blockedJobs.push({
            job_number: job.job_number,
            blocked_at: pendingOp.operation_name,
            blocked_op_status: pendingOp.status
          });
        }
      }
    }

    const bufferTarget = config.buffer_target_hours ?? 4;
    const bufferStatus = readyForConstraint >= bufferTarget ? 'healthy' :
      readyForConstraint >= bufferTarget * 0.5 ? 'warning' : 'critical';

    await prisma.bufferLog.create({
      data: {
        tenant_id,
        machine_id: config.machine_id,
        buffer_hours: Math.round(readyForConstraint * 10) / 10,
        buffer_target_hours: bufferTarget,
        buffer_status: bufferStatus
      }
    });

    const bufferHistory = await prisma.bufferLog.findMany({
      where: { tenant_id, machine_id: config.machine_id },
      orderBy: { logged_at: 'desc' },
      take: 24
    });

    res.json({
      success: true,
      data: {
        constraint_machine: config.machine?.machine_name,
        buffer_target_hours: bufferTarget,
        buffer_available_hours: Math.round(readyForConstraint * 10) / 10,
        buffer_status: bufferStatus,
        blocked_jobs: blockedJobs,
        total_blocked: blockedJobs.length,
        buffer_history: bufferHistory
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getShiftSummary = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { date, shift } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const constraint = await prisma.machineMaster.findFirst({
      where: { tenant_id, is_constraint: true }
    });

    const jobFilter: any = {
      tenant_id,
      planned_date: { gte: startOfDay, lte: endOfDay }
    };
    if (shift) jobFilter.shift = shift;

    const jobs = await prisma.jobCard.findMany({
      where: jobFilter,
      include: {
        shot_logs: true,
        downtime_logs: true,
        rejection_logs: true,
        job_operations: true
      }
    });

    const totalPlanned = jobs.reduce((sum: number, j: any) => sum + j.planned_quantity, 0);
    const totalGood = jobs.reduce((sum: number, j: any) => sum + j.actual_quantity_good, 0);
    const totalShots = jobs.reduce((sum: number, j: any) => sum + j.shot_logs.length, 0);
    const totalRejections = jobs.reduce((sum: number, j: any) => sum + j.rejection_logs.length, 0);
    const totalDowntimeMin = jobs.reduce((sum: number, j: any) =>
      sum + j.downtime_logs.reduce((s: number, d: any) => s + (d.duration_min || 0), 0), 0);

    const shiftMinutes = 480;
    const availability = Math.round(((shiftMinutes - totalDowntimeMin) / shiftMinutes) * 100);
    const quality = totalShots > 0 ? Math.round((totalGood / totalShots) * 100) : 0;

    let constraintOEE = null;
    if (constraint) {
      const constraintJobs = jobs.filter((j: any) => j.machine_id === constraint.id);
      const cShots = constraintJobs.reduce((sum: number, j: any) => sum + j.shot_logs.length, 0);
      const cGood = constraintJobs.reduce((sum: number, j: any) => sum + j.actual_quantity_good, 0);
      const cDowntime = constraintJobs.reduce((sum: number, j: any) =>
        sum + j.downtime_logs.reduce((s: number, d: any) => s + (d.duration_min || 0), 0), 0);
      const cAvailability = (shiftMinutes - cDowntime) / shiftMinutes;
      const cRatedCycle = constraint.rated_cycle_time_sec ?? 48;
      const cTheoretical = ((shiftMinutes - cDowntime) * 60) / cRatedCycle;
      const cPerformance = cTheoretical > 0 ? Math.min(cShots / cTheoretical, 1) : 0;
      const cQuality = cShots > 0 ? cGood / cShots : 0;
      constraintOEE = Math.round(cAvailability * cPerformance * cQuality * 100);
    }

    res.json({
      success: true,
      data: {
        date: startOfDay,
        shift: shift || 'all',
        constraint_machine: constraint?.machine_name,
        constraint_oee: constraintOEE,
        constraint_oee_target: constraint?.oee_target_percent,
        total_jobs: jobs.length,
        total_planned_qty: totalPlanned,
        total_good_qty: totalGood,
        total_shots: totalShots,
        total_rejections: totalRejections,
        rejection_rate_percent: totalShots > 0 ? Math.round((totalRejections / totalShots) * 100 * 10) / 10 : 0,
        total_downtime_minutes: totalDowntimeMin,
        availability_percent: availability,
        quality_percent: quality,
        achievement_percent: totalPlanned > 0 ? Math.round((totalGood / totalPlanned) * 100) : 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;

    const config = await prisma.constraintConfig.findFirst({
      where: { tenant_id, is_active_constraint: true },
      include: { machine: true }
    });

    const activeJobs = await prisma.jobCard.findMany({
      where: { tenant_id, status: { in: ['planned', 'released', 'in_progress'] } }
    });

    const alerts = await prisma.systemAlert.findMany({
      where: { tenant_id, is_resolved: false },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    const pendingJWOs = await prisma.jobWorkOrder.findMany({
      where: { tenant_id, status: { in: ['sent', 'draft'] } },
      include: { vendor: true }
    });

    const latestBuffer = config ? await prisma.bufferLog.findFirst({
      where: { tenant_id, machine_id: config.machine_id },
      orderBy: { logged_at: 'desc' }
    }) : null;

    let constraintOEE = null;
    if (config) {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      const constraintJobs = await prisma.jobCard.findMany({
        where: {
          tenant_id,
          machine_id: config.machine_id,
          planned_date: { gte: startOfDay, lte: endOfDay }
        },
        include: { shot_logs: true, downtime_logs: true }
      });
      const totalShots = constraintJobs.reduce((sum: number, j: any) => sum + j.shot_logs.length, 0);
      const goodShots = constraintJobs.reduce((sum: number, j: any) => sum + j.actual_quantity_good, 0);
      const totalDowntime = constraintJobs.reduce((sum: number, j: any) =>
        sum + j.downtime_logs.reduce((s: number, d: any) => s + (d.duration_min || 0), 0), 0);
      const shiftMin = 480;
      const avail = (shiftMin - totalDowntime) / shiftMin;
      const cycleTime = config.machine?.rated_cycle_time_sec ?? 48;
      const theoretical = ((shiftMin - totalDowntime) * 60) / cycleTime;
      const perf = theoretical > 0 ? Math.min(totalShots / theoretical, 1) : 0;
      const qual = totalShots > 0 ? goodShots / totalShots : 0;
      constraintOEE = Math.round(avail * perf * qual * 100);
    }

    res.json({
      success: true,
      data: {
        constraint: config ? {
          machine_name: config.machine?.machine_name,
          buffer_target_hours: config.buffer_target_hours,
          current_buffer_hours: latestBuffer?.buffer_hours,
          buffer_status: latestBuffer?.buffer_status,
          oee: constraintOEE,
          oee_target: config.machine?.oee_target_percent
        } : null,
        active_jobs: activeJobs.length,
        unresolved_alerts: alerts.length,
        alerts,
        pending_job_work_orders: pendingJWOs.length,
        job_work_orders: pendingJWOs
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
