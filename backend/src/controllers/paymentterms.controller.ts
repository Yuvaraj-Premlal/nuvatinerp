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

const generatePaymentCode = (days: number, description: string, discount_percent?: number, discount_days?: number): string => {
  const desc = description.toLowerCase();
  if (days === 0 && (desc.includes('advance') || desc.includes('adv'))) return 'ADV';
  if (days === 0 && (desc.includes('cod') || desc.includes('cash on delivery'))) return 'COD';
  let code = `NET${days}`;
  if (discount_percent && discount_days) code += `D${discount_percent}-${discount_days}`;
  return code;
};

export const createPaymentTerms = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { description, days, discount_percent, discount_days } = req.body;
    const code = generatePaymentCode(parseInt(days), description, discount_percent ? parseFloat(discount_percent) : undefined, discount_days ? parseInt(discount_days) : undefined);
    // Duplicate check
    const existing = await prisma.paymentTerms.findFirst({ where: { tenant_id, code } });
    if (existing) return res.status(400).json({ success: false, error: `Payment terms "${code}" already exists` });
    const terms = await prisma.paymentTerms.create({ data: { tenant_id, code, ...req.body, days: parseInt(days), discount_percent: discount_percent ? parseFloat(discount_percent) : null, discount_days: discount_days ? parseInt(discount_days) : null } });
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
