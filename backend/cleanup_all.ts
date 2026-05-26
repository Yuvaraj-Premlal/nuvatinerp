import prisma from './src/config/prisma';
async function main() {
  const tenant_id = 'c737a8cd-8dd2-408b-ba9f-00b8adb6697e';

  await prisma.pOAmendmentLog.deleteMany({ where: { tenant_id } });
  process.stdout.write('POAmendmentLogs deleted\n');

  await prisma.paymentVoucher.deleteMany({ where: { tenant_id } });
  process.stdout.write('PaymentVouchers deleted\n');

  await prisma.supplierBillLine.deleteMany({ where: { bill: { tenant_id } } });
  await prisma.supplierBill.deleteMany({ where: { tenant_id } });
  process.stdout.write('SupplierBills deleted\n');

  await prisma.complaintAction.deleteMany({ where: { tenant_id } });
  await prisma.complaintHeader.deleteMany({ where: { tenant_id } });
  process.stdout.write('Complaints deleted\n');

  await prisma.grnLine.deleteMany({ where: { grn: { tenant_id } } });
  await prisma.grnHeader.deleteMany({ where: { tenant_id } });
  process.stdout.write('GRNs deleted\n');

  await prisma.purchaseOrderLine.deleteMany({ where: { po: { tenant_id } } });
  await prisma.purchaseOrder.deleteMany({ where: { tenant_id } });
  process.stdout.write('Purchase Orders deleted\n');

  await prisma.stockLedger.deleteMany({ where: { tenant_id } });
  process.stdout.write('Stock Ledger deleted\n');

  await prisma.systemAlert.deleteMany({ where: { tenant_id } });
  process.stdout.write('System Alerts deleted\n');

  process.stdout.write('\n=== CLEANUP COMPLETE ===\n');
}
main().catch(console.error).finally(() => prisma.$disconnect());
