import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const generateCode = (prefix: string, name: string, seq: number) => {
  const short = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase().padEnd(4, 'X');
  return `${prefix}-${short}-${String(seq).padStart(4, '0')}`;
};

export const getVendors = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const vendors = await prisma.vendorMaster.findMany({
      where: { tenant_id, is_active: true },
      orderBy: { vendor_name: 'asc' }
    });
    res.json({ success: true, data: vendors });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createVendor = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { vendor_name, ...rest } = req.body;
    const count = await prisma.vendorMaster.count({ where: { tenant_id } });
    const vendor_code = generateCode('VEND', vendor_name, count + 1);
    const vendor = await prisma.vendorMaster.create({
      data: { tenant_id, vendor_code, vendor_name, ...rest,
        lead_time_days: rest.lead_time_days ? parseInt(rest.lead_time_days) : null
      }
    });
    res.status(201).json({ success: true, data: vendor });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createJobWorkOrder = async (req: AuthRequest, res: Response) => {
  try { res.json({ success: true, data: {} }); } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
export const createJobWorkReceipt = async (req: AuthRequest, res: Response) => {
  try { res.json({ success: true, data: {} }); } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
export const getJobWorkOrders = async (req: AuthRequest, res: Response) => {
  try { res.json({ success: true, data: [] }); } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const updateVendor = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const vendor = await prisma.vendorMaster.update({ where: { id }, data: req.body });
    res.json({ success: true, data: vendor });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
