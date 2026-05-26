import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getQuarantineStock = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { disposition } = req.query;
    const where: any = { tenant_id };
    if (disposition) where.disposition = String(disposition);

    const quarantine = await prisma.quarantineStock.findMany({
      where,
      include: { item: { select: { item_name: true, item_code: true, unit_of_measure: true } } },
      orderBy: { created_at: 'desc' }
    });

    const summary = {
      total_items: quarantine.length,
      pending: quarantine.filter((q: any) => q.disposition === 'pending').length,
      total_qty: quarantine.reduce((s: number, q: any) => s + q.quantity, 0)
    };

    res.json({ success: true, data: quarantine, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const disposeQuarantineStock = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = String(req.params.id);
    const { disposition, disposed_by, disposition_notes } = req.body;

    const quarantine = await prisma.quarantineStock.findFirst({ where: { id, tenant_id } });
    if (!quarantine) return res.status(404).json({ success: false, error: 'Quarantine record not found' });
    if (quarantine.disposition !== 'pending') return res.status(400).json({ success: false, error: 'Already disposed' });

    await prisma.quarantineStock.updateMany({
      where: { id, tenant_id },
      data: { disposition, disposed_at: new Date(), disposed_by, disposition_notes }
    });

    // Handle disposition actions
    if (disposition === 'scrapped') {
      // Stock already not in main stock — just record
      await prisma.systemAlert.create({
        data: {
          tenant_id,
          alert_type: 'quarantine_disposed',
          severity: 'info',
          message: `Quarantine stock scrapped — ${quarantine.quantity} units of item ${quarantine.item_id} from GRN ${quarantine.grn_number}`,
          reference_type: 'quarantine',
          reference_id: id
        }
      });
    } else if (disposition === 'return_to_supplier') {
      await prisma.systemAlert.create({
        data: {
          tenant_id,
          alert_type: 'quarantine_return',
          severity: 'info',
          message: `Quarantine stock to be returned to supplier — ${quarantine.quantity} units from GRN ${quarantine.grn_number}. Raise debit note in Finance.`,
          reference_type: 'quarantine',
          reference_id: id
        }
      });
    } else if (disposition === 'rework') {
      await prisma.systemAlert.create({
        data: {
          tenant_id,
          alert_type: 'quarantine_rework',
          severity: 'info',
          message: `Quarantine stock approved for rework — ${quarantine.quantity} units from GRN ${quarantine.grn_number}. Create job card for rework.`,
          reference_type: 'quarantine',
          reference_id: id
        }
      });
    } else if (disposition === 'use_as_is') {
      // Move back to main stock
      await prisma.stockLedger.create({
        data: {
          tenant_id,
          item_id: quarantine.item_id,
          transaction_type: 'receipt',
          quantity: quarantine.quantity,
          reference_type: 'quarantine_use_as_is',
          reference_id: id,
          transacted_by: disposed_by,
          adjustment_reason: `Use as is — deviation accepted. Notes: ${disposition_notes || 'None'}`
        }
      });
      await prisma.systemAlert.create({
        data: {
          tenant_id,
          alert_type: 'quarantine_use_as_is',
          severity: 'warning',
          message: `Quarantine stock accepted with deviation — ${quarantine.quantity} units added back to stock. GRN: ${quarantine.grn_number}`,
          reference_type: 'quarantine',
          reference_id: id
        }
      });
    }

    res.json({ success: true, message: `Quarantine stock ${disposition.replace('_', ' ')}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
