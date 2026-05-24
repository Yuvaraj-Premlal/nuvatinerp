import prisma from './src/config/prisma';
async function main() {
  // Delete test GRNs — keep only GRN-2026-0001
  const testGrnIds = [
    '68c0fb1a-0f05-46e2-ae39-fb4966bff6bc', // GRN-2026-2367
    'fa9e6b52-6f95-4dd4-acbf-58193a0a002e'  // GRN-2026-8777
  ];
  await prisma.grnLine.deleteMany({ where: { grn_id: { in: testGrnIds } } });
  await prisma.grnHeader.deleteMany({ where: { id: { in: testGrnIds } } });
  process.stdout.write('Test GRNs deleted\n');

  // Reverse stock entries for these test GRNs
  await prisma.stockLedger.deleteMany({ where: { reference_id: { in: testGrnIds } } });
  process.stdout.write('Stock entries cleaned\n');

  // Recalculate PO-2026-0001
  const po_id = '3f2e4bf5-8111-400b-a0bc-ba1682ea4158';
  const tenant_id = 'c737a8cd-8dd2-408b-ba9f-00b8adb6697e';
  const po = await prisma.purchaseOrder.findFirst({ where: { id: po_id, tenant_id }, include: { po_lines: true } });
  if (po) {
    const poGrns = await prisma.grnHeader.findMany({ where: { po_id, tenant_id, is_reversed: false } });
    const poGrnIds = poGrns.map((g: any) => g.id);
    for (const pol of po.po_lines) {
      const lines = poGrnIds.length > 0 ? await prisma.grnLine.findMany({ where: { grn_id: { in: poGrnIds }, item_id: pol.item_id } }) : [];
      const total = lines.reduce((s: number, l: any) => s + (l.accepted_qty || l.quantity_received), 0);
      await prisma.purchaseOrderLine.updateMany({ where: { id: pol.id }, data: { quantity_received: total } });
      process.stdout.write(`PO-2026-0001 | quantity_received updated to: ${total}\n`);
    }
    // Update PO status
    const updatedPO = await prisma.purchaseOrder.findFirst({ where: { id: po_id, tenant_id }, include: { po_lines: true } });
    if (updatedPO) {
      const allReceived = updatedPO.po_lines.every((p: any) => p.quantity_received >= p.quantity_ordered);
      await prisma.purchaseOrder.updateMany({ where: { id: po_id, tenant_id }, data: { status: allReceived ? 'received' : 'approved' } });
      process.stdout.write(`PO status: ${allReceived ? 'received' : 'approved'}\n`);
    }
  }

  // Recalculate stock balance
  const totalStock = await prisma.stockLedger.aggregate({
    where: { tenant_id, item_id: '070c4336-d4ca-4406-ad80-3eece22ffb54' },
    _sum: { quantity: true }
  });
  process.stdout.write(`Stock balance after cleanup: ${totalStock._sum.quantity} KG\n`);
}
main().finally(() => prisma.$disconnect());
