import prisma from '../config/prisma';

export const logChange = async (
  tenant_id: string,
  entity_type: string,
  entity_id: string,
  entity_code: string,
  action: string,
  old_data: any,
  new_data: any,
  user_id: string,
  email: string,
  reason?: string
) => {
  try {
    const changed_fields: any[] = [];
    if (old_data && new_data) {
      for (const key of Object.keys(new_data)) {
        if (['updated_at', 'created_at'].includes(key)) continue;
        const oldVal = old_data[key];
        const newVal = new_data[key];
        if (oldVal !== newVal && newVal !== undefined) {
          changed_fields.push({ field: key, old_value: oldVal ?? null, new_value: newVal ?? null });
        }
      }
    }
    if (changed_fields.length === 0 && action === 'update') return;
    await prisma.auditLog.create({
      data: {
        tenant_id, entity_type, entity_id, entity_code,
        action, changed_fields,
        changed_by_id: user_id,
        changed_by_email: email,
        reason: reason || null
      }
    });
  } catch (e) {
    console.error('Audit log error:', e);
  }
};
