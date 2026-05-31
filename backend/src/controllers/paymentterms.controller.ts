import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getPaymentTerms = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const terms = await prisma.paymentTerms.findMany({
      where: { tenant_id, },
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

export const togglePaymenttermsStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required' });
    const existing = await (prisma as any).paymentTerms.findUnique({ where: { id } });
    const updated = await (prisma as any).paymentTerms.update({ where: { id }, data: { is_active: !existing?.is_active } });
    const { logChange } = await import('../utils/audit');
    await logChange(existing?.tenant_id || '', 'paymentterms', id, existing?.code || '', existing?.is_active ? 'deactivate' : 'activate', existing, updated, req.user?.user_id || '', req.user?.email || '', reason);
    res.json({ success: true, data: updated });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
