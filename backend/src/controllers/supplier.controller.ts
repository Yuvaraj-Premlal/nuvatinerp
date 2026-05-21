import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { supplier_code, supplier_name, address, gstin, payment_terms, lead_time_days, moq, currency } = req.body;
    const supplier = await prisma.supplierMaster.create({
      data: { tenant_id, supplier_code, supplier_name, address, gstin, payment_terms, lead_time_days, moq, currency }
    });
    res.status(201).json({ success: true, data: supplier });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSuppliers = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const suppliers = await prisma.supplierMaster.findMany({
      where: { tenant_id, is_active: true }
    });
    res.json({ success: true, data: suppliers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSupplierById = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id as string;
    const supplier = await prisma.supplierMaster.findFirst({
      where: { id, tenant_id },
      include: { item_suppliers: { include: { item: true } } }
    });
    res.json({ success: true, data: supplier });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};