import { logChange } from '../utils/audit';
import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const generateCode = (prefix: string, name: string, seq: number) => {
  const short = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase().padEnd(4, 'X');
  return `${prefix}-${short}-${String(seq).padStart(4, '0')}`;
};

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const customers = await prisma.customerMaster.findMany({
      where: { tenant_id, is_active: true },
      orderBy: { customer_name: 'asc' }
    });
    res.json({ success: true, data: customers });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { customer_name, ...rest } = req.body;
    const count = await prisma.customerMaster.count({ where: { tenant_id } });
    const customer_code = generateCode('CUST', customer_name, count + 1);
    const customer = await prisma.customerMaster.create({
      data: { tenant_id, customer_code, customer_name, ...rest }
    });
    res.status(201).json({ success: true, data: customer });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { reason, ...updateData } = req.body;
    const old = await prisma.customerMaster.findUnique({ where: { id } });
    const customer = await prisma.customerMaster.update({ where: { id }, data: updateData });
    await logChange(old?.tenant_id || '', 'customer', id, old?.customer_code || '', 'update', old, customer, req.user?.user_id || '', req.user?.email || '', reason);
    res.json({ success: true, data: customer });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const toggleCustomerStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required' });
    const old = await prisma.customerMaster.findUnique({ where: { id } });
    const customer = await prisma.customerMaster.update({ where: { id }, data: { is_active: !old?.is_active } });
    await logChange(old?.tenant_id || '', 'customer', id, old?.customer_code || '', old?.is_active ? 'deactivate' : 'activate', old, customer, req.user?.user_id || '', req.user?.email || '', reason);
    res.json({ success: true, data: customer });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
