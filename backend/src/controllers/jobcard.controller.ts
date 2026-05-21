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
    res.status(201).json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getJobCards = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const jobs = await prisma.jobCard.findMany({
      where: { tenant_id },
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
        shot_logs: { orderBy: { logged_at: 'desc' }, take: 20 },
        downtime_logs: true,
        material_issues: true,
        rejection_logs: true
      }
    });
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