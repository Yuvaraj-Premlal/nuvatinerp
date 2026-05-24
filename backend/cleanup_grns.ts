import prisma from './src/config/prisma';
async function main() {
  const tenant_id = 'c737a8cd-8dd2-408b-ba9f-00b8adb6697e';
  const grns = await prisma.grnHeader.findMany({
    where: { tenant_id },
    include: { grn_lines: true }
  });
  grns.forEach((g: any) => {
    process.stdout.write(`${g.grn_number} | po_id: ${g.po_id} | id: ${g.id}\n`);
  });
}
main().finally(() => prisma.$disconnect());
