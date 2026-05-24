import prisma from './src/config/prisma';
async function main() {
  const pos = await prisma.purchaseOrder.findMany({
    where: { tenant_id: 'c737a8cd-8dd2-408b-ba9f-00b8adb6697e', is_latest_revision: true },
    include: { po_lines: { include: { item: true } }, supplier: true },
    orderBy: { created_at: 'desc' }
  });
  process.stdout.write(`Found ${pos.length} POs\n`);
  process.stdout.write(JSON.stringify(pos[0], null, 2).slice(0, 500) + '\n');
}
main().catch(e => process.stderr.write(e.message + '\n')).finally(() => prisma.$disconnect());
