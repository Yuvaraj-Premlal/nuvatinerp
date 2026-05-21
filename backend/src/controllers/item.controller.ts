import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createItem = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { item_code, item_name, item_type, unit_of_measure, item_category, description } = req.body;

    const item = await prisma.itemMaster.create({
      data: { tenant_id, item_code, item_name, item_type, unit_of_measure, item_category, description }
    });

    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getItems = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { item_type } = req.query;

    const items = await prisma.itemMaster.findMany({
      where: {
        tenant_id,
        is_active: true,
        ...(item_type ? { item_type: item_type as string } : {})
      },
      include: { pfep_detail: true }
    });

    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getItemById = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id as string;

    const item = await prisma.itemMaster.findFirst({
      where: { id, tenant_id },
      include: {
        pfep_detail: true,
        item_suppliers: { include: { supplier: true } }
      }
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateItem = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id as string;
    const { item_name, item_category, description, is_active } = req.body;

    const item = await prisma.itemMaster.updateMany({
      where: { id, tenant_id },
      data: { item_name, item_category, description, is_active }
    });

    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
