import prisma from './src/config/prisma';
async function main() {
  const result = await prisma.purchaseOrder.updateMany({
    where: { tenant_id: 'c737a8cd-8dd2-408b-ba9f-00b8adb6697e' },
    data: { is_latest_revision: true, revision_number: 0 }
  });
  process.stdout.write(`Updated ${result.count} POs\n`);
}
main().finally(() => prisma.$disconnect());
