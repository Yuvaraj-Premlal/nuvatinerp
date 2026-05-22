import prisma from './src/config/prisma';

async function update() {
  const tenant = await prisma.tenant.findUnique({ where: { code: 'ALUSMITH001' } });
  if (!tenant) { console.log('Tenant not found'); return; }

  await prisma.machineMaster.updateMany({
    where: { tenant_id: tenant.id, machine_code: 'DCM-250T-01' },
    data: { power_kw: 45, operators_required: 2 }
  });
  console.log('Machine updated');

  await prisma.costConfig.upsert({
    where: { tenant_id_config_key: { tenant_id: tenant.id, config_key: 'energy_rate_per_kwh' } },
    update: { config_value: 8 },
    create: { tenant_id: tenant.id, config_key: 'energy_rate_per_kwh', config_value: 8, description: 'Energy rate per kWh in INR' }
  });

  await prisma.costConfig.upsert({
    where: { tenant_id_config_key: { tenant_id: tenant.id, config_key: 'operator_rate_per_shift' } },
    update: { config_value: 800 },
    create: { tenant_id: tenant.id, config_key: 'operator_rate_per_shift', config_value: 800, description: 'Operator cost per shift in INR' }
  });

  await prisma.costConfig.upsert({
    where: { tenant_id_config_key: { tenant_id: tenant.id, config_key: 'scrap_rate_per_kg' } },
    update: { config_value: 80 },
    create: { tenant_id: tenant.id, config_key: 'scrap_rate_per_kg', config_value: 80, description: 'Scrap recovery rate per kg in INR' }
  });

  await prisma.costConfig.upsert({
    where: { tenant_id_config_key: { tenant_id: tenant.id, config_key: 'operating_expense_per_shift' } },
    update: { config_value: 48000 },
    create: { tenant_id: tenant.id, config_key: 'operating_expense_per_shift', config_value: 48000, description: 'Fixed operating expense per shift — rent, admin, depreciation' }
  });

  await prisma.itemMaster.updateMany({
    where: { tenant_id: tenant.id, item_code: 'FG-GBH-001' },
    data: { selling_price: 450, material_cost: 305.94 }
  });

  console.log('Cost config seeded');
  console.log('Item selling price updated');
}

update().catch(console.error).finally(() => prisma.$disconnect());
