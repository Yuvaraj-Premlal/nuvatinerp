import prisma from './src/config/prisma';
async function main() {
  const tenant_id = 'c737a8cd-8dd2-408b-ba9f-00b8adb6697e';
  const grns = await prisma.grnHeader.findMany({
    where: { tenant_id },
    include: { grn_lines: true }
  });
  grns.forEach((g: any) => {
    process.stdout.write(`${g.grn_number} | reversed: ${g.is_reversed}\n`);
    g.grn_lines.forEach((l: any) => {
      process.stdout.write(`  item: ${l.item_id} | received: ${l.quantity_received} | accepted: ${l.accepted_qty} | rejected: ${l.rejected_qty}\n`);
    });
  });
}
main().finally(() => prisma.$disconnect());
