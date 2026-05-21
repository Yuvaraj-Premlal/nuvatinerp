import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createBom = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { item_id, bom_revision, effective_date, status, lines } = req.body;
    const bom = await prisma.bomHeader.create({
      data: {
        tenant_id, item_id, bom_revision, effective_date, status,
        bom_lines: {
          create: lines.map((l: any) => ({
            tenant_id,
            component_item_id: l.component_item_id,
            quantity_per: l.quantity_per,
            unit_of_measure: l.unit_of_measure,
            yield_factor: l.yield_factor,
            scrap_percent: l.scrap_percent,
            line_type: l.line_type
          }))
        }
      },
      include: { bom_lines: true }
    });
    res.status(201).json({ success: true, data: bom });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getBomByItem = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const item_id = req.params.item_id as string;
    const bom = await prisma.bomHeader.findMany({
      where: { tenant_id, item_id },
      include: { bom_lines: { include: { component_item: true } } }
    });
    res.json({ success: true, data: bom });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};