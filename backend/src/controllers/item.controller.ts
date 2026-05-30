import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const TYPE_PREFIX: Record<string, string> = {
  raw_material: 'RM',
  finished_goods: 'FG',
  semi_finished: 'SF',
  consumable: 'CONS',
  spare: 'SPARE',
  tool: 'TOOL',
  packaging: 'PKG'
};

const generateItemCode = (item_type: string, item_name: string, seq: number) => {
  const prefix = TYPE_PREFIX[item_type] || 'ITEM';
  const short = item_name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase().padEnd(4, 'X');
  return `${prefix}-${short}-${String(seq).padStart(4, '0')}`;
};

export const getItems = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { item_type } = req.query;
    const where: any = { tenant_id, is_active: true };
    if (item_type) where.item_type = String(item_type);
    const items = await prisma.itemMaster.findMany({
      where,
      include: { alloy_spec: { select: { id: true } } },
      orderBy: { item_code: 'asc' }
    });
    res.json({ success: true, data: items });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createItem = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { item_name, item_type, ...rest } = req.body;
    const count = await prisma.itemMaster.count({ where: { tenant_id, item_type } });
    const item_code = generateItemCode(item_type, item_name, count + 1);
    const item = await prisma.itemMaster.create({
      data: {
        tenant_id, item_code, item_name, item_type, ...rest,
        standard_cost: rest.standard_cost ? parseFloat(rest.standard_cost) : null,
        material_cost: rest.material_cost ? parseFloat(rest.material_cost) : null,
        selling_price: rest.selling_price ? parseFloat(rest.selling_price) : null,
        reorder_point: rest.reorder_point ? parseFloat(rest.reorder_point) : null,
        safety_stock: rest.safety_stock ? parseFloat(rest.safety_stock) : null,
        order_quantity: rest.order_quantity ? parseFloat(rest.order_quantity) : null,
      }
    });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const getItemById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const item = await prisma.itemMaster.findUnique({ where: { id }, include: { alloy_spec: true } });
    res.json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const updateItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const item = await prisma.itemMaster.update({ where: { id }, data: req.body });
    res.json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
