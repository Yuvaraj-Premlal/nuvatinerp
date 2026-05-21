import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { customer_code, customer_name, address, gstin, contact_person, contact_phone, payment_terms } = req.body;
    const customer = await prisma.customerMaster.create({
      data: { tenant_id, customer_code, customer_name, address, gstin, contact_person, contact_phone, payment_terms }
    });
    res.status(201).json({ success: true, data: customer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const customers = await prisma.customerMaster.findMany({
      where: { tenant_id, is_active: true }
    });
    res.json({ success: true, data: customers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
