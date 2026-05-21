import prisma from './src/config/prisma';

async function fixData() {
  console.log('Fixing data...');

  const tenant = await prisma.tenant.findUnique({ where: { code: 'ALUSMITH001' } });
  if (!tenant) { console.log('Tenant not found'); return; }

  const fgItem = await prisma.itemMaster.upsert({
    where: { tenant_id_item_code: { tenant_id: tenant.id, item_code: 'FG-GBH-001' } },
    update: {},
    create: { tenant_id: tenant.id, item_code: 'FG-GBH-001', item_name: 'Gearbox Housing', item_type: 'finished_goods', unit_of_measure: 'PCS', item_category: 'Casting', description: 'ADC12 Gearbox Housing casting' }
  });
  console.log('FG Item:', fgItem.id);

  await prisma.itemPfepDetail.upsert({
    where: { item_id: fgItem.id },
    update: {},
    create: { tenant_id: tenant.id, item_id: fgItem.id, gross_weight_kg: 1.82, net_weight_kg: 1.39, yield_percent: 76, storage_location: 'FG Store', rack_address: 'Rack FG-1', zone: 'B', reorder_point: 0, safety_stock: 0, order_quantity: 0, abc_classification: 'A', constraint_flag: false }
  });
  console.log('FG PFEP done');

  const rmItem = await prisma.itemMaster.findUnique({ where: { tenant_id_item_code: { tenant_id: tenant.id, item_code: 'RM-ADC12' } } });
  if (!rmItem) { console.log('RM item not found'); return; }

  const bom = await prisma.bomHeader.upsert({
    where: { tenant_id_item_id_bom_revision: { tenant_id: tenant.id, item_id: fgItem.id, bom_revision: 'B' } },
    update: {},
    create: {
      tenant_id: tenant.id, item_id: fgItem.id, bom_revision: 'B', status: 'active',
      bom_lines: { create: [{ tenant_id: tenant.id, component_item_id: rmItem.id, quantity_per: 1.82, unit_of_measure: 'KG', yield_factor: 0.76, scrap_percent: 24, line_type: 'material' }] }
    }
  });
  console.log('BOM:', bom.id);

  const machine = await prisma.machineMaster.findFirst({ where: { tenant_id: tenant.id, machine_code: 'DCM-250T-01' } });
  if (!machine) { console.log('Machine not found'); return; }

  const routing = await prisma.routingHeader.upsert({
    where: { tenant_id_item_id_routing_revision: { tenant_id: tenant.id, item_id: fgItem.id, routing_revision: 'A' } },
    update: {},
    create: {
      tenant_id: tenant.id, item_id: fgItem.id, routing_revision: 'A', status: 'active',
      operations: {
        create: [
          { tenant_id: tenant.id, operation_sequence: 10, operation_name: 'Melting', standard_time_sec: 2700, setup_time_min: 30, is_constraint: false, is_pre_constraint_inspection: true, operation_type: 'casting' },
          { tenant_id: tenant.id, operation_sequence: 20, operation_name: 'Die Casting', machine_id: machine.id, standard_time_sec: 48, setup_time_min: 45, is_constraint: true, is_pre_constraint_inspection: false, operation_type: 'casting' },
          { tenant_id: tenant.id, operation_sequence: 30, operation_name: 'Trimming', standard_time_sec: 12, setup_time_min: 10, is_constraint: false, is_pre_constraint_inspection: false, operation_type: 'casting' },
          { tenant_id: tenant.id, operation_sequence: 40, operation_name: 'Shot Blasting', standard_time_sec: 480, setup_time_min: 5, is_constraint: false, is_pre_constraint_inspection: false, operation_type: 'finishing' },
          { tenant_id: tenant.id, operation_sequence: 50, operation_name: 'Inspection', standard_time_sec: 60, setup_time_min: 0, is_constraint: false, is_pre_constraint_inspection: false, operation_type: 'inspection' }
        ]
      }
    }
  });
  console.log('Routing:', routing.id);

  const customer = await prisma.customerMaster.upsert({
    where: { tenant_id_customer_code: { tenant_id: tenant.id, customer_code: 'CUST-BAJAJ-001' } },
    update: {},
    create: { tenant_id: tenant.id, customer_code: 'CUST-BAJAJ-001', customer_name: 'Bajaj Auto', address: 'Pune, Maharashtra', gstin: '27AABCB1234A1ZN', contact_person: 'Purchase Manager', payment_terms: '45 days' }
  });
  console.log('Customer:', customer.id);

  console.log('');
  console.log('=== FIX COMPLETE ===');
  console.log('FG Item ID:', fgItem.id);
  console.log('BOM ID:', bom.id);
  console.log('Routing ID:', routing.id);
  console.log('Customer ID:', customer.id);
}

fixData().catch(console.error).finally(() => prisma.$disconnect());
