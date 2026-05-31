import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getLocations = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const locations = await prisma.locationMaster.findMany({
      where: { tenant_id, },
      orderBy: [{ zone: 'asc' }, { code: 'asc' }]
    });
    res.json({ success: true, data: locations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createLocation = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { code, description, zone, type } = req.body;
    const location = await prisma.locationMaster.create({
      data: { tenant_id, code: code.toUpperCase(), description, zone, type: type || "store" }
    });
    res.json({ success: true, data: location });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateLocation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { reason, description, zone, location_type, capacity_kg, rack_count, bin_count } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required' });
    const existing = await prisma.locationMaster.findUnique({ where: { id } });
    const location = await prisma.locationMaster.update({ where: { id }, data: {
      description: description || null,
      zone: zone || null,
      ...(location_type && { type: location_type }),
      capacity_kg: capacity_kg ? parseFloat(capacity_kg) : null,
      rack_count: rack_count ? parseInt(rack_count) : null,
      bin_count: bin_count ? parseInt(bin_count) : null,
    }});
    const { logChange } = await import('../utils/audit');
    await logChange(existing?.tenant_id || '', 'location', id, existing?.code || '', 'update', existing, location, req.user?.user_id || '', req.user?.email || '', reason);
    res.json({ success: true, data: location });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const transferLocation = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { batch_number, item_id, from_location, to_location, quantity, transferred_by } = req.body;

    if (!to_location) return res.status(400).json({ success: false, error: 'to_location is required' });

    // Write transfer movement to stock ledger (out from old, in to new)
    await prisma.stockLedger.create({
      data: {
        tenant_id,
        item_id,
        transaction_type: 'location_transfer',
        quantity: 0,
        location: to_location,
        batch_number,
        reference_type: 'location_transfer',
        transacted_by: transferred_by || 'Storekeeper',
        adjustment_reason: `Transfer from ${from_location || 'unknown'} to ${to_location}`
      }
    });

    res.json({ success: true, message: `Batch ${batch_number} transferred to ${to_location}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const toggleLocationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required' });
    const existing = await (prisma as any).locationMaster.findUnique({ where: { id } });
    const updated = await (prisma as any).locationMaster.update({ where: { id }, data: { is_active: !existing?.is_active } });
    const { logChange } = await import('../utils/audit');
    await logChange(existing?.tenant_id || '', 'location', id, existing?.code || '', existing?.is_active ? 'deactivate' : 'activate', existing, updated, req.user?.user_id || '', req.user?.email || '', reason);
    res.json({ success: true, data: updated });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
