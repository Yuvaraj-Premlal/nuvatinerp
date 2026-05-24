import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createGRN = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { grn_number, po_id, supplier_id, received_by, vehicle_number, supplier_dc_number, lines } = req.body;

    const grn = await prisma.grnHeader.create({
      data: {
        tenant_id, grn_number, po_id, supplier_id, received_by, vehicle_number, supplier_dc_number,
        grn_lines: {
          create: lines.map((l: any) => ({
            tenant_id,
            item_id: l.item_id,
            quantity_received: parseFloat(l.quantity_received),
            accepted_qty: parseFloat(l.accepted_qty || l.quantity_received),
            rejected_qty: parseFloat(l.rejected_qty || 0),
            rejection_reason: l.rejection_reason,
            batch_number: l.batch_number,
            lot_number: l.lot_number,
            unit_price: parseFloat(l.unit_price || 0)
          }))
        }
      },
      include: { grn_lines: true }
    });

    // Update stock ledger — only accepted qty
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

      // Auto-raise SCAR if rejection > 1%
      const receivedQty = parseFloat(line.quantity_received);
      const rejectedQty = parseFloat(line.rejected_qty || 0);
      if (receivedQty > 0 && rejectedQty > 0) {
        const rejectionPercent = (rejectedQty / receivedQty) * 100;
        if (rejectionPercent > 1) {
          const po = po_id ? await prisma.purchaseOrder.findFirst({ where: { id: po_id, tenant_id }, include: { supplier: true } }) : null;
          const count = await prisma.complaintHeader.count({ where: { tenant_id } });
          const complaint_number = `CMP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
          const complaint = await prisma.complaintHeader.create({
            data: {
              tenant_id,
              complaint_number,
              complaint_type: 'supplier',
              severity: rejectionPercent > 5 ? 'critical' : 'major',
              title: `Supplier rejection — GRN ${grn_number}`,
              description: `Rejection of ${rejectedQty} units (${rejectionPercent.toFixed(1)}%) received in GRN ${grn_number}. Reason: ${line.rejection_reason || 'Not specified'}`,
              supplier_id: po?.supplier_id || supplier_id,
              grn_id: grn.id,
              quantity_affected: rejectedQty,
              due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
              status: 'open'
            }
          });
          // Create CAPA actions
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
              message: `SCAR auto-raised — ${po?.supplier?.supplier_name || 'Supplier'} rejection ${rejectionPercent.toFixed(1)}% in GRN ${grn_number}. Complaint: ${complaint_number}`,
              reference_type: 'complaint',
              reference_id: complaint.id
            }
          });
        }
      }
    }

    // Update PO line quantity_received = sum of all accepted GRN lines for that item/PO
    if (po_id) {
      const po = await prisma.purchaseOrder.findFirst({ where: { id: po_id, tenant_id }, include: { po_lines: true } });
      if (po) {
        for (const pol of po.po_lines) {
          const allGrnLines = await prisma.grnLine.findMany({
            where: {
              item_id: pol.item_id,
              grn: { po_id: po_id, tenant_id }
            },
            include: { grn: true }
          });
          // Only count non-reversed GRNs
          const totalAccepted = allGrnLines
            .filter((gl: any) => !(gl.grn as any).is_reversed)
            .reduce((sum: number, gl: any) => sum + (gl.accepted_qty || gl.quantity_received), 0);

          await prisma.purchaseOrderLine.updateMany({
            where: { id: pol.id },
            data: { quantity_received: totalAccepted }
          });
        }

        // Refresh PO lines after update
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
      include: { grn_lines: { include: { item: true } } }
    });

    res.status(201).json({ success: true, data: fullGrn });
  } catch (error: any) {
    console.error('createGRN error:', error.message, error.meta);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const reverseGRN = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = String(req.params.id);
    const { reason } = req.body;

    const grn = await prisma.grnHeader.findFirst({
      where: { id, tenant_id },
      include: { grn_lines: true }
    });

    if (!grn) return res.status(404).json({ success: false, error: 'GRN not found' });
    if ((grn as any).is_reversed) return res.status(400).json({ success: false, error: 'GRN already reversed' });

    // Check if supplier bill already created
    const bill = await prisma.supplierBill.findFirst({ where: { grn_id: id, tenant_id } });
    if (bill && bill.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Cannot reverse — supplier bill already processed' });
    }

    // Reverse stock entries
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

    // Mark GRN as reversed
    await prisma.grnHeader.updateMany({
      where: { id, tenant_id },
      data: { is_reversed: true, reversal_reason: reason, reversed_at: new Date() } as any
    });

    // Delete pending bill if exists
    if (bill) {
      await prisma.supplierBillLine.deleteMany({ where: { bill_id: bill.id } });
      await prisma.supplierBill.delete({ where: { id: bill.id } });
    }

    // Recalculate PO line quantity_received
    if (grn.po_id) {
      const po = await prisma.purchaseOrder.findFirst({ where: { id: grn.po_id, tenant_id }, include: { po_lines: true } });
      if (po) {
        for (const pol of po.po_lines) {
          const allGrnLines = await prisma.grnLine.findMany({
            where: { item_id: pol.item_id, grn: { po_id: grn.po_id, tenant_id } },
            include: { grn: true }
          });
          const totalAccepted = allGrnLines
            .filter((gl: any) => !(gl.grn as any).is_reversed)
            .reduce((sum: number, gl: any) => sum + (gl.accepted_qty || gl.quantity_received), 0);
          await prisma.purchaseOrderLine.updateMany({ where: { id: pol.id }, data: { quantity_received: totalAccepted } });
        }
        // Revert PO status
        await prisma.purchaseOrder.updateMany({
          where: { id: grn.po_id, tenant_id },
          data: { status: 'approved' }
        });
      }
    }

    res.json({ success: true, message: 'GRN reversed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getGRNs = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const grns = await prisma.grnHeader.findMany({
      where: { tenant_id },
      include: { grn_lines: { include: { item: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: grns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
