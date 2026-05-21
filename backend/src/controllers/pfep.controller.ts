import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createOrUpdatePfep = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const item_id = req.params.item_id as string;
    const { gross_weight_kg, net_weight_kg, yield_percent, storage_location, rack_address, zone, reorder_point, safety_stock, order_quantity, shelf_life_days, abc_classification, constraint_flag } = req.body;
    const pfep = await prisma.itemPfepDetail.upsert({
      where: { item_id },
      create: { tenant_id, item_id, gross_weight_kg, net_weight_kg, yield_percent, storage_location, rack_address, zone, reorder_point, safety_stock, order_quantity, shelf_life_days, abc_classification, constraint_flag },
      update: { gross_weight_kg, net_weight_kg, yield_percent, storage_location, rack_address, zone, reorder_point, safety_stock, order_quantity, shelf_life_days, abc_classification, constraint_flag }
    });
    res.json({ success: true, data: pfep });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPfepByItem = async (req: AuthRequest, res: Response) => {
  try {
    const item_id = req.params.item_id as string;
    const pfep = await prisma.itemPfepDetail.findUnique({
      where: { item_id },
      include: { item: true }
    });
    res.json({ success: true, data: pfep });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};