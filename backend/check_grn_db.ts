import prisma from './src/config/prisma';
async function main() {
  const tenant_id = 'c737a8cd-8dd2-408b-ba9f-00b8adb6697e';
  const grn = await prisma.grnHeader.findFirst({
    where: { tenant_id, grn_number: 'GRN-2026-5093' },
    include: { grn_lines: true }
  });
  if (grn) {
    process.stdout.write(JSON.stringify(grn.grn_lines, null, 2) + '\n');
  }
}
main().finally(() => prisma.$disconnect());
