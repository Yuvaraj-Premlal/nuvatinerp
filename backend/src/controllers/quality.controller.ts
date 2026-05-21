import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createInspection = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { job_id, inspection_type, inspector_id, result, lines } = req.body;
    const inspection = await prisma.inspectionHeader.create({
      data: {
        tenant_id, job_id, inspection_type, inspector_id, result,
        inspection_lines: {
          create: lines.map((l: any) => ({
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const logRejection = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { job_id, item_id, inspection_id, quantity_rejected, rejection_stage, defect_code, defect_description, die_id, machine_id, alloy_lot, disposition, logged_by } = req.body;
    const rejection = await prisma.rejectionLog.create({
      data: { tenant_id, job_id, item_id, inspection_id, quantity_rejected, rejection_stage, defect_code, defect_description, die_id, machine_id, alloy_lot, disposition, logged_by }
    });
    res.status(201).json({ success: true, data: rejection });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getInspectionsByJob = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const job_id = req.params.job_id as string;
    const inspections = await prisma.inspectionHeader.findMany({
      where: { tenant_id, job_id },
      include: { inspection_lines: true, rejection_logs: true }
    });
    res.json({ success: true, data: inspections });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getRejections = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const rejections = await prisma.rejectionLog.findMany({
      where: { tenant_id },
      orderBy: { logged_at: 'desc' },
      take: 50
    });
    res.json({ success: true, data: rejections });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};