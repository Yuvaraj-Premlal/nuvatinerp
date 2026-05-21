import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const createTenant = async (req: Request, res: Response) => {
  try {
    const { name, code, industry, address, gstin } = req.body;

    const tenant = await prisma.tenant.create({
      data: { name, code, industry, address, gstin }
    });

    res.status(201).json({ success: true, data: tenant });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTenants = async (req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { is_active: true }
    });

    res.json({ success: true, data: tenants });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTenantById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const tenant = await prisma.tenant.findUnique({
      where: { id }
    });

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    res.json({ success: true, data: tenant });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
