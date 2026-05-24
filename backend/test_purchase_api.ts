import prisma from './src/config/prisma';

async function main() {
  const tenant_id = 'c737a8cd-8dd2-408b-ba9f-00b8adb6697e';
  
  // Test 1: Can we query purchase orders?
  try {
    const pos = await prisma.purchaseOrder.findMany({
      where: { tenant_id },
      include: { po_lines: { include: { item: true } }, supplier: true },
      orderBy: { created_at: 'desc' }
    });
    process.stdout.write(`GET POs: OK — ${pos.length} found\n`);
  } catch(e: any) {
    process.stdout.write(`GET POs FAILED: ${e.message}\n`);
  }

  // Test 2: Can we create a PO?
  try {
    const count = await prisma.purchaseOrder.count({ where: { tenant_id } });
    const po_number = `PO-TEST-${Date.now()}`;
    const supplier = await prisma.supplierMaster.findFirst({ where: { tenant_id } });
    const item = await prisma.itemMaster.findFirst({ where: { tenant_id } });
    
    if (!supplier || !item) {
      process.stdout.write('No supplier or item found\n');
      return;
    }

    const po = await prisma.purchaseOrder.create({
      data: {
        tenant_id,
        po_number,
        status: 'draft',
        po_date: new Date(),
        supplier_id: supplier.id,
        raised_by: 'test',
        po_lines: {
          create: [{
            tenant_id,
            item_id: item.id,
            quantity_ordered: 100,
            unit_price: 187,
            quantity_received: 0
          }]
        }
      }
    });
    process.stdout.write(`CREATE PO: OK — ${po.id}\n`);
    
    // Clean up
    await prisma.purchaseOrderLine.deleteMany({ where: { po_id: po.id } });
    await prisma.purchaseOrder.delete({ where: { id: po.id } });
    process.stdout.write('Cleanup: OK\n');
  } catch(e: any) {
    process.stdout.write(`CREATE PO FAILED: ${e.message}\n`);
    process.stdout.write(`Meta: ${JSON.stringify(e.meta)}\n`);
  }
}

main().finally(() => prisma.$disconnect());
