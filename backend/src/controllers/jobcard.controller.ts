import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createJobCard = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { job_number, item_id, bom_id, routing_id, machine_id, die_id, planned_quantity, shift, planned_date } = req.body;
    const job = await prisma.jobCard.create({
      data: { tenant_id, job_number, item_id, bom_id, routing_id, machine_id, die_id, planned_quantity, shift, planned_date }
    });
    if (routing_id) {
      const operations = await prisma.routingOperation.findMany({
        where: { routing_id },
        orderBy: { operation_sequence: 'asc' }
      });
      await prisma.jobCardOperation.createMany({
        data: operations.map((op: any) => ({
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
    const jobWithOps = await prisma.jobCard.findUnique({
      where: { id: job.id },
      include: { job_operations: { orderBy: { operation_sequence: 'asc' } } }
    });
    res.status(201).json({ success: true, data: jobWithOps });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getJobCards = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const jobs = await prisma.jobCard.findMany({
      where: { tenant_id },
      include: { job_operations: { orderBy: { operation_sequence: 'asc' } } },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: jobs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getJobCardById = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id as string;
    const job = await prisma.jobCard.findFirst({
      where: { id, tenant_id },
      include: {
        job_operations: { orderBy: { operation_sequence: 'asc' } },
        shot_logs: { orderBy: { logged_at: 'desc' }, take: 20 },
        downtime_logs: true,
        material_issues: true,
        rejection_logs: true
      }
    });
    if (!job) return res.status(404).json({ success: false, error: 'Job card not found' });
    res.json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateJobCardStatus = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id as string;
    const { status, actual_start, actual_end, actual_quantity_good } = req.body;
    const job = await prisma.jobCard.updateMany({
      where: { id, tenant_id },
      data: { status, actual_start, actual_end, actual_quantity_good }
    });
    res.json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateOperationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const op_id = req.params.op_id as string;
    const { status, actual_start, actual_end, operator_id, notes } = req.body;
    const op = await prisma.jobCardOperation.updateMany({
      where: { id: op_id, tenant_id },
      data: { status, actual_start, actual_end, operator_id, notes }
    });
    res.json({ success: true, data: op });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const logShot = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const job_id = req.params.id as string;
    const { shot_number, shot_result, rejection_reason, logged_by } = req.body;
    const shot = await prisma.shotLog.create({
      data: { tenant_id, job_id, shot_number, shot_result, rejection_reason, logged_by }
    });
    if (shot_result === 'good') {
      await prisma.jobCard.updateMany({
        where: { id: job_id, tenant_id },
        data: { actual_quantity_good: { increment: 1 } }
      });
    }
    const job = await prisma.jobCard.findFirst({ where: { id: job_id } });
    if (job && job.die_id) {
      await prisma.dieMaster.updateMany({
        where: { id: job.die_id },
        data: { current_shot_count: { increment: 1 } }
      });
      const die = await prisma.dieMaster.findUnique({ where: { id: job.die_id } });
      if (die && die.pm_interval_shots) {
        const shotsSinceLastPM = die.current_shot_count - die.shots_at_last_pm;
        if (shotsSinceLastPM >= die.pm_interval_shots * 0.9) {
          await prisma.systemAlert.create({
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const logDowntime = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const job_id = req.params.id as string;
    const { machine_id, start_time, end_time, duration_min, downtime_category, reason_code, reason_detail, logged_by } = req.body;
    const downtime = await prisma.downtimeLog.create({
      data: { tenant_id, job_id, machine_id, start_time, end_time, duration_min, downtime_category, reason_code, reason_detail, logged_by }
    });
    res.status(201).json({ success: true, data: downtime });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
