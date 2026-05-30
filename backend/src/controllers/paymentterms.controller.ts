import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getPaymentTerms = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const terms = await prisma.paymentTerms.findMany({
      where: { tenant_id, is_active: true },
      orderBy: { days: 'asc' }
    });
    res.json({ success: true, data: terms });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createPaymentTerms = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const terms = await prisma.paymentTerms.create({ data: { tenant_id, ...req.body } });
    res.status(201).json({ success: true, data: terms });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const updatePaymentTerms = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const terms = await prisma.paymentTerms.update({ where: { id }, data: req.body });
    res.json({ success: true, data: terms });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
