import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createGRN = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { po_id, supplier_id, received_by, vehicle_number, supplier_dc_number, lines } = req.body;
    console.log('GRN lines received:', JSON.stringify(lines));

    // Auto-generate GRN number
    const latest = await prisma.grnHeader.findFirst({ where: { tenant_id }, orderBy: { created_at: 'desc' } });
    const lastNum = latest ? parseInt(latest.grn_number.split('-')[2] || '0') : 0;
    const grn_number = `GRN-${new Date().getFullYear()}-${String(lastNum + 1).padStart(4, '0')}`;

    const grn = await prisma.grnHeader.create({
      data: {
        tenant_id, grn_number, po_id, supplier_id, received_by, vehicle_number, supplier_dc_number,
        grn_lines: {
          create: lines.map((l: any) => ({
            tenant_id,
            item_id: l.item_id,
            quantity_received: parseFloat(l.quantity_received),
            accepted_qty: parseFloat(l.accepted_qty || l.quantity_received),
            rejected_qty: parseFloat(l.rejected_qty || l.quantity_rejected || 0),
            rejection_reason: l.rejection_reason,
            batch_number: l.batch_number,
            lot_number: l.lot_number,
            unit_price: parseFloat(l.unit_price || 0)
          }))
        }
      },
      include: { grn_lines: true }
    });

    for (const line of lines) {
      const acceptedQty = parseFloat(line.accepted_qty || line.quantity_received);
      if (acceptedQty > 0) {
        await prisma.stockLedger.create({
          data: {
            tenant_id,
            item_id: line.item_id,
            transaction_type: 'receipt',
            quantity: acceptedQty,
            unit_cost: parseFloat(line.unit_price || 0),
            reference_type: 'grn',
            reference_id: grn.id,
            batch_number: line.batch_number,
            lot_number: line.lot_number
          }
        });
      }

      const receivedQty = parseFloat(line.quantity_received);
      const rejectedQty = parseFloat(line.rejected_qty || line.quantity_rejected || 0);
      if (receivedQty > 0 && rejectedQty > 0) {
        const rejectionPercent = (rejectedQty / receivedQty) * 100;
        if (rejectionPercent > 1) {
          const po = po_id ? await prisma.purchaseOrder.findFirst({ where: { id: po_id, tenant_id }, include: { supplier: true } }) : null;
          const supplierIdForSCAR = po?.supplier_id || supplier_id;

          // Check if open SCAR already exists for this supplier + PO
          const existingSCAR = await prisma.complaintHeader.findFirst({
            where: {
              tenant_id,
              complaint_type: 'supplier',
              supplier_id: supplierIdForSCAR,
              status: { not: 'closed' },
              ...(po_id ? { description: { contains: po_id } } : {})
            },
            orderBy: { created_at: 'desc' }
          });

          if (existingSCAR) {
            // Update existing SCAR with new rejection details
            await prisma.complaintHeader.updateMany({
              where: { id: existingSCAR.id },
              data: {
                quantity_affected: (existingSCAR.quantity_affected || 0) + rejectedQty,
                description: existingSCAR.description + `\n• ${grn_number} | ${new Date().toLocaleDateString('en-IN')} | Rejected: ${rejectedQty} units (${rejectionPercent.toFixed(1)}%) | Reason: ${line.rejection_reason || 'Not specified'}`,
                severity: rejectionPercent > 5 ? 'critical' : existingSCAR.severity
              }
            });
            await prisma.systemAlert.create({
              data: {
                tenant_id,
                alert_type: 'supplier_rejection',
                severity: 'warning',
                message: `Additional rejection — GRN ${grn_number}: ${rejectedQty} units (${rejectionPercent.toFixed(1)}%). Added to existing SCAR ${existingSCAR.complaint_number}`,
                reference_type: 'complaint',
                reference_id: existingSCAR.id
              }
            });
          } else {
            // Create new SCAR
            const count = await prisma.complaintHeader.count({ where: { tenant_id } });
            const complaint_number = `CMP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
            const poNumber = po?.po_number || po_id;
            const supplierName = (po as any)?.supplier?.supplier_name || 'Supplier';
            const description = `Supplier Rejection Report — ${poNumber} | ${supplierName}

• ${grn_number} | ${new Date().toLocaleDateString('en-IN')} | Rejected: ${rejectedQty} units (${rejectionPercent.toFixed(1)}%) | Reason: ${line.rejection_reason || 'Not specified'}`;
            const complaint = await prisma.complaintHeader.create({
              data: {
                tenant_id,
                complaint_number,
                complaint_type: 'supplier',
                severity: rejectionPercent > 5 ? 'critical' : 'major',
                title: `Supplier rejection — ${poNumber} | ${grn_number}`,
                description,
                supplier_id: supplierIdForSCAR,
                grn_id: grn.id,
                quantity_affected: rejectedQty,
                due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                status: 'open'
              }
            });
            await prisma.complaintAction.createMany({
              data: [
                { tenant_id, complaint_id: complaint.id, action_type: 'containment', step_number: 1, description: 'Segregate and quarantine rejected material', status: 'pending' },
                { tenant_id, complaint_id: complaint.id, action_type: 'rca', step_number: 2, description: 'Root cause analysis — identify why material was rejected', status: 'pending' },
                { tenant_id, complaint_id: complaint.id, action_type: 'capa', step_number: 3, description: 'Corrective action — supplier to submit SCAR response', status: 'pending' },
                { tenant_id, complaint_id: complaint.id, action_type: 'verify', step_number: 4, description: 'Verify effectiveness of corrective action on next delivery', status: 'pending' }
              ]
            });
            await prisma.systemAlert.create({
              data: {
                tenant_id,
                alert_type: 'supplier_rejection',
                severity: rejectionPercent > 5 ? 'critical' : 'warning',
                message: `SCAR auto-raised — ${(po as any)?.supplier?.supplier_name || 'Supplier'} rejection ${rejectionPercent.toFixed(1)}% in GRN ${grn_number}. Complaint: ${complaint_number}`,
                reference_type: 'complaint',
                reference_id: complaint.id
              }
            });
          }
        }
      }
    }

    if (po_id) {
      const po = await prisma.purchaseOrder.findFirst({ where: { id: po_id, tenant_id }, include: { po_lines: true } });
      if (po) {
        for (const pol of po.po_lines) {
          const poGrns = await prisma.grnHeader.findMany({ where: { po_id, tenant_id, is_reversed: false } });
          const poGrnIds = poGrns.map((g: any) => g.id);
          const allGrnLines = poGrnIds.length > 0 ? await prisma.grnLine.findMany({ where: { grn_id: { in: poGrnIds }, item_id: pol.item_id } }) : [];
          const totalAccepted = allGrnLines.reduce((sum: number, gl: any) => sum + (gl.accepted_qty || gl.quantity_received), 0);
          await prisma.purchaseOrderLine.updateMany({ where: { id: pol.id }, data: { quantity_received: totalAccepted } });
        }
        const updatedPO = await prisma.purchaseOrder.findFirst({ where: { id: po_id, tenant_id }, include: { po_lines: true } });
        if (updatedPO) {
          const allFullyReceived = updatedPO.po_lines.every((pol: any) => pol.quantity_received >= pol.quantity_ordered);
          const anyReceived = updatedPO.po_lines.some((pol: any) => pol.quantity_received > 0);
          if (allFullyReceived) {
            await prisma.purchaseOrder.updateMany({ where: { id: po_id, tenant_id }, data: { status: 'received' } });
          } else if (anyReceived) {
            await prisma.purchaseOrder.updateMany({ where: { id: po_id, tenant_id }, data: { status: 'partial_received' } });
          }
        }
      }
    }

    const fullGrn = await prisma.grnHeader.findFirst({
      where: { id: grn.id },
      include: {
        grn_lines: { include: { item: true } },
        po: { select: { po_number: true, supplier_id: true, supplier: true } }
      }
    });

    res.status(201).json({ success: true, data: fullGrn });
  } catch (error: any) {
    console.error('createGRN error:', error.message, error.meta);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getGRNs = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const grns = await prisma.grnHeader.findMany({
      where: { tenant_id },
      include: {
        grn_lines: { include: { item: true } },
        po: { select: { po_number: true, supplier: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: grns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getGRNById = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = String(req.params.id);
    const grn = await prisma.grnHeader.findFirst({
      where: { id, tenant_id },
      include: {
        grn_lines: { include: { item: true } },
        po: { include: { supplier: true, po_lines: true } }
      }
    });
    if (!grn) return res.status(404).json({ success: false, error: 'GRN not found' });

    // Check if bill exists
    const bill = await prisma.supplierBill.findFirst({ where: { grn_id: id, tenant_id } });

    res.json({ success: true, data: { ...grn, bill } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const reverseGRN = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = String(req.params.id);
    const { reason } = req.body;

    const grn = await prisma.grnHeader.findFirst({ where: { id, tenant_id }, include: { grn_lines: true } });
    if (!grn) return res.status(404).json({ success: false, error: 'GRN not found' });
    if ((grn as any).is_reversed) return res.status(400).json({ success: false, error: 'GRN already reversed' });

    const bill = await prisma.supplierBill.findFirst({ where: { grn_id: id, tenant_id } });
    if (bill && bill.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Cannot reverse — supplier bill already processed' });
    }

    for (const line of grn.grn_lines) {
      const acceptedQty = line.accepted_qty || line.quantity_received;
      if (acceptedQty > 0) {
        await prisma.stockLedger.create({
          data: {
            tenant_id,
            item_id: line.item_id,
            transaction_type: 'grn_reversal',
            quantity: -acceptedQty,
            reference_type: 'grn_reversal',
            reference_id: id
          }
        });
      }
    }

    await prisma.grnHeader.updateMany({
      where: { id, tenant_id },
      data: { is_reversed: true, reversal_reason: reason, reversed_at: new Date() } as any
    });

    if (bill) {
      await prisma.supplierBillLine.deleteMany({ where: { bill_id: bill.id } });
      await prisma.supplierBill.delete({ where: { id: bill.id } });
    }

    if (grn.po_id) {
      const po = await prisma.purchaseOrder.findFirst({ where: { id: grn.po_id, tenant_id }, include: { po_lines: true } });
      if (po) {
        for (const pol of po.po_lines) {
          const poGrns2 = await prisma.grnHeader.findMany({ where: { po_id: grn.po_id, tenant_id, is_reversed: false } });
          const poGrnIds2 = poGrns2.map((g: any) => g.id);
          const allGrnLines2 = poGrnIds2.length > 0 ? await prisma.grnLine.findMany({ where: { grn_id: { in: poGrnIds2 }, item_id: pol.item_id } }) : [];
          const totalAccepted = allGrnLines2.reduce((sum: number, gl: any) => sum + (gl.accepted_qty || gl.quantity_received), 0);
          await prisma.purchaseOrderLine.updateMany({ where: { id: pol.id }, data: { quantity_received: totalAccepted } });
        }
        await prisma.purchaseOrder.updateMany({ where: { id: grn.po_id, tenant_id }, data: { status: 'approved' } });
      }
    }

    res.json({ success: true, message: 'GRN reversed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
