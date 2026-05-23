import prisma from './src/config/prisma';


async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { code: 'ALUSMITH001' } });
  if (!tenant) { process.exit(1); }
  const tid = tenant.id;

  const accounts = [
    { code: '1001', name: 'HDFC Current Account', type: 'asset', subtype: 'current_asset' },
    { code: '1002', name: 'Petty Cash', type: 'asset', subtype: 'current_asset' },
    { code: '1100', name: 'Accounts Receivable', type: 'asset', subtype: 'current_asset' },
    { code: '1201', name: 'Raw Material Stock', type: 'asset', subtype: 'current_asset' },
    { code: '1202', name: 'Work In Progress', type: 'asset', subtype: 'current_asset' },
    { code: '1203', name: 'Finished Goods Stock', type: 'asset', subtype: 'current_asset' },
    { code: '1301', name: 'CGST Input Credit', type: 'asset', subtype: 'current_asset' },
    { code: '1302', name: 'SGST Input Credit', type: 'asset', subtype: 'current_asset' },
    { code: '1303', name: 'IGST Input Credit', type: 'asset', subtype: 'current_asset' },
    { code: '1401', name: 'Machinery and Equipment', type: 'asset', subtype: 'fixed_asset' },
    { code: '1402', name: 'Dies and Tooling', type: 'asset', subtype: 'fixed_asset' },
    { code: '2000', name: 'Accounts Payable', type: 'liability', subtype: 'current_liability' },
    { code: '2101', name: 'CGST Payable', type: 'liability', subtype: 'current_liability' },
    { code: '2102', name: 'SGST Payable', type: 'liability', subtype: 'current_liability' },
    { code: '2103', name: 'IGST Payable', type: 'liability', subtype: 'current_liability' },
    { code: '2200', name: 'Loans and Borrowings', type: 'liability', subtype: 'long_term_liability' },
    { code: '3000', name: 'Sales Revenue', type: 'income', subtype: 'revenue' },
    { code: '3001', name: 'Other Income', type: 'income', subtype: 'revenue' },
    { code: '4001', name: 'Material Cost', type: 'expense', subtype: 'cogs' },
    { code: '4002', name: 'Energy Cost', type: 'expense', subtype: 'cogs' },
    { code: '4003', name: 'Labour Cost', type: 'expense', subtype: 'cogs' },
    { code: '4004', name: 'Job Work Cost', type: 'expense', subtype: 'cogs' },
    { code: '5001', name: 'Salaries and Wages', type: 'expense', subtype: 'opex' },
    { code: '5002', name: 'Rent', type: 'expense', subtype: 'opex' },
    { code: '5003', name: 'Utilities', type: 'expense', subtype: 'opex' },
    { code: '5004', name: 'Maintenance and Repairs', type: 'expense', subtype: 'opex' },
    { code: '5005', name: 'Other Expenses', type: 'expense', subtype: 'opex' },
    { code: '6001', name: 'Owner Capital', type: 'equity', subtype: 'equity' },
    { code: '6002', name: 'Retained Earnings', type: 'equity', subtype: 'equity' }
  ];

  for (const acc of accounts) {
    await prisma.chartOfAccount.upsert({
      where: { tenant_id_account_code: { tenant_id: tid, account_code: acc.code } },
      update: {},
      create: {
        tenant_id: tid,
        account_code: acc.code,
        account_name: acc.name,
        account_type: acc.type,
        account_subtype: acc.subtype,
        is_system: true
      }
    });
  }

  await prisma.companyConfig.upsert({
    where: { tenant_id: tid },
    update: {},
    create: {
      tenant_id: tid,
      legal_name: 'Alusmith Die Castings Pvt Ltd',
      gstin: '34AABCA1234A1Z5',
      address: 'Plot 12, SIPCOT Industrial Area',
      city: 'Puducherry',
      state: 'Puducherry',
      state_code: '34',
      pincode: '605007',
      invoice_prefix: 'INV',
      cn_prefix: 'CN',
      dn_prefix: 'DN'
    }
  });

  const existingBank = await prisma.bankAccount.findFirst({ where: { tenant_id: tid } });
  if (!existingBank) {
    await prisma.bankAccount.create({
      data: {
        tenant_id: tid,
        account_name: 'HDFC Current Account',
        bank_name: 'HDFC Bank',
        account_number: 'XXXX1234',
        ifsc_code: 'HDFC0001234',
        opening_balance: 500000,
        current_balance: 500000
      }
    });
  }

  process.stdout.write('Finance seeded successfully\n');
}

main().catch((e) => { process.stderr.write(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
