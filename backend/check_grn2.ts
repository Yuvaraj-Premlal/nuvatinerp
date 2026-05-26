import prisma from './src/config/prisma';
async function main() {
  const tenant_id = 'c737a8cd-8dd2-408b-ba9f-00b8adb6697e';
  const grn = await prisma.grnHeader.findFirst({
    where: { tenant_id, grn_number: 'GRN-2026-5085' },
    include: { grn_lines: true }
  });
  if (grn) {
    grn.grn_lines.forEach((l: any) => {
      process.stdout.write(`received: ${l.quantity_received} | accepted: ${l.accepted_qty} | rejected: ${l.rejected_qty}\n`);
    });
  }
}
main().finally(() => prisma.$disconnect());
