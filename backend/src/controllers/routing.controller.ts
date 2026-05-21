import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createRouting = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { item_id, routing_revision, effective_date, status, operations } = req.body;
    const routing = await prisma.routingHeader.create({
      data: {
        tenant_id, item_id, routing_revision, effective_date, status,
        operations: {
          create: operations.map((op: any) => ({
            tenant_id,
            operation_sequence: op.operation_sequence,
            operation_name: op.operation_name,
            machine_id: op.machine_id,
            standard_time_sec: op.standard_time_sec,
            setup_time_min: op.setup_time_min,
            is_constraint: op.is_constraint,
            is_pre_constraint_inspection: op.is_pre_constraint_inspection
          }))
        }
      },
      include: { operations: true }
    });
    res.status(201).json({ success: true, data: routing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getRoutingByItem = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const item_id = req.params.item_id as string;
    const routing = await prisma.routingHeader.findMany({
      where: { tenant_id, item_id },
      include: { operations: { include: { machine: true }, orderBy: { operation_sequence: 'asc' } } }
    });
    res.json({ success: true, data: routing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};