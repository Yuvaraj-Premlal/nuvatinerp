import prisma from './src/config/prisma';
async function main() {
  const tenant_id = 'c737a8cd-8dd2-408b-ba9f-00b8adb6697e';
  const pos = await prisma.purchaseOrder.findMany({ where: { tenant_id }, include: { po_lines: true } });
  for (const po of pos) {
    const poGrns = await prisma.grnHeader.findMany({ where: { po_id: po.id, tenant_id, is_reversed: false } });
    const poGrnIds = poGrns.map((g: any) => g.id);
    for (const pol of po.po_lines) {
      const allGrnLines = poGrnIds.length > 0 ? await prisma.grnLine.findMany({ where: { grn_id: { in: poGrnIds }, item_id: pol.item_id } }) : [];
      const totalAccepted = allGrnLines.reduce((sum: number, gl: any) => sum + (gl.accepted_qty || gl.quantity_received), 0);
      await prisma.purchaseOrderLine.updateMany({ where: { id: pol.id }, data: { quantity_received: totalAccepted } });
      process.stdout.write(`PO ${po.po_number} | Item ${pol.item_id} | Received: ${totalAccepted}\n`);
    }
  }
}
main().finally(() => prisma.$disconnect());
