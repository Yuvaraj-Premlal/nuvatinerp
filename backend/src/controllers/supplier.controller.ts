import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const generateCode = (prefix: string, name: string, seq: number) => {
  const short = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase().padEnd(4, 'X');
  return `${prefix}-${short}-${String(seq).padStart(4, '0')}`;
};

export const getSuppliers = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const suppliers = await prisma.supplierMaster.findMany({
      where: { tenant_id, is_active: true },
      orderBy: { supplier_name: 'asc' }
    });
    res.json({ success: true, data: suppliers });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { supplier_name, ...rest } = req.body;
    const count = await prisma.supplierMaster.count({ where: { tenant_id } });
    const supplier_code = generateCode('SUP', supplier_name, count + 1);
    const supplier = await prisma.supplierMaster.create({
      data: { tenant_id, supplier_code, supplier_name, ...rest,
        lead_time_days: rest.lead_time_days ? parseInt(rest.lead_time_days) : null,
        payment_days: rest.payment_days ? parseInt(rest.payment_days) : 30,
        credit_limit: rest.credit_limit ? parseFloat(rest.credit_limit) : null,
        moq: rest.moq ? parseFloat(rest.moq) : null,
        rating: rest.rating ? parseFloat(rest.rating) : null,
        payment_terms_id: rest.payment_terms_id || null
      }
    });
    res.status(201).json({ success: true, data: supplier });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const getSupplierById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const supplier = await prisma.supplierMaster.findUnique({ where: { id } });
    res.json({ success: true, data: supplier });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const updateSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const supplier = await prisma.supplierMaster.update({ where: { id }, data: req.body });
    res.json({ success: true, data: supplier });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
