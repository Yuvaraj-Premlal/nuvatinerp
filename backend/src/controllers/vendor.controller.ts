import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createVendor = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { vendor_code, vendor_name, address, gstin, operation_types, payment_terms, lead_time_days } = req.body;
    const vendor = await prisma.vendorMaster.create({
      data: { tenant_id, vendor_code, vendor_name, address, gstin, operation_types, payment_terms, lead_time_days }
    });
    res.status(201).json({ success: true, data: vendor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getVendors = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const vendors = await prisma.vendorMaster.findMany({
      where: { tenant_id, is_active: true }
    });
    res.json({ success: true, data: vendors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createJobWorkOrder = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { jwo_number, job_card_id, vendor_id, item_id, operation_id, quantity_sent, outward_challan, expected_return_date, job_work_charge } = req.body;
    const jwo = await prisma.jobWorkOrder.create({
      data: { tenant_id, jwo_number, job_card_id, vendor_id, item_id, operation_id, quantity_sent, outward_challan, expected_return_date, job_work_charge, status: 'sent' }
    });
    await prisma.stockLedger.create({
      data: { tenant_id, item_id, transaction_type: 'sent_to_vendor', quantity: -quantity_sent, reference_type: 'job_work_order', reference_id: jwo.id, location: 'at_vendor' }
    });
    res.status(201).json({ success: true, data: jwo });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createJobWorkReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { jwr_number, jwo_id, quantity_received, accepted_qty, rejected_qty, rejection_reason, inward_challan, job_work_charge_billed, received_by } = req.body;
    const jwo = await prisma.jobWorkOrder.findUnique({ where: { id: jwo_id } });
    const jwr = await prisma.jobWorkReceipt.create({
      data: { tenant_id, jwr_number, jwo_id, quantity_received, accepted_qty, rejected_qty, rejection_reason, inward_challan, job_work_charge_billed, received_by }
    });
    if (jwo && accepted_qty) {
      await prisma.stockLedger.create({
        data: { tenant_id, item_id: jwo.item_id as string, transaction_type: 'received_from_vendor', quantity: accepted_qty, reference_type: 'job_work_receipt', reference_id: jwr.id, location: 'in_house' }
      });
    }
    await prisma.jobWorkOrder.update({
      where: { id: jwo_id },
      data: { status: 'completed' }
    });
    res.status(201).json({ success: true, data: jwr });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getJobWorkOrders = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const orders = await prisma.jobWorkOrder.findMany({
      where: { tenant_id },
      include: { vendor: true, receipts: true },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};