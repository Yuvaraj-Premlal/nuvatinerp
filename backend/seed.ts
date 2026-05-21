import prisma from './src/config/prisma';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding database...');

  const tenant = await prisma.tenant.upsert({
    where: { code: 'ALUSMITH001' },
    update: {},
    create: { name: 'Alusmith', code: 'ALUSMITH001', industry: 'Die Casting', address: 'Puducherry, Tamil Nadu', gstin: '34AQMPD5297J1ZG' }
  });
  console.log('Tenant:', tenant.id);

  const hashed = await bcrypt.hash('Alusmith@2026', 10);
  const user = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'admin@alusmith.com' } },
    update: {},
    create: { tenant_id: tenant.id, email: 'admin@alusmith.com', password: hashed, first_name: 'Admin', last_name: 'Alusmith', role: 'owner' }
  });
  console.log('User:', user.id);

  const item = await prisma.itemMaster.upsert({
    where: { tenant_id_item_code: { tenant_id: tenant.id, item_code: 'RM-ADC12' } },
    update: {},
    create: { tenant_id: tenant.id, item_code: 'RM-ADC12', item_name: 'Aluminium Ingot ADC12', item_type: 'raw_material', unit_of_measure: 'KG', item_category: 'Metal', description: 'ADC12 aluminium alloy ingot' }
  });
  console.log('Item:', item.id);

  await prisma.itemPfepDetail.upsert({
    where: { item_id: item.id },
    update: {},
    create: { tenant_id: tenant.id, item_id: item.id, gross_weight_kg: 1.82, net_weight_kg: 1.39, yield_percent: 76, storage_location: 'RM Bay', rack_address: 'Rack R-3', zone: 'A', reorder_point: 1500, safety_stock: 2000, order_quantity: 3000, abc_classification: 'A', constraint_flag: false }
  });
  console.log('PFEP detail done');

  const supplier = await prisma.supplierMaster.upsert({
    where: { tenant_id_supplier_code: { tenant_id: tenant.id, supplier_code: 'SUP-HIND-001' } },
    update: {},
    create: { tenant_id: tenant.id, supplier_code: 'SUP-HIND-001', supplier_name: 'Hindalco Industries', address: 'Mumbai, Maharashtra', gstin: '27AAACH0130A1ZN', payment_terms: '30 days', lead_time_days: 3, moq: 1000, currency: 'INR' }
  });
  console.log('Supplier:', supplier.id);

  const machine = await prisma.machineMaster.upsert({
    where: { tenant_id_machine_code: { tenant_id: tenant.id, machine_code: 'DCM-250T-01' } },
    update: {},
    create: { tenant_id: tenant.id, machine_code: 'DCM-250T-01', machine_name: '250T Cold Chamber #1', machine_type: 'cold_chamber', capacity_tons: 250, rated_cycle_time_sec: 48, rated_shots_per_shift: 540, is_constraint: true, oee_target_percent: 78, location: 'Shop Floor Bay 1' }
  });
  console.log('Machine:', machine.id);

  const die = await prisma.dieMaster.upsert({
    where: { tenant_id_die_number: { tenant_id: tenant.id, die_number: 'D-047' } },
    update: {},
    create: { tenant_id: tenant.id, die_number: 'D-047', die_name: 'Gearbox Housing Die', item_id: item.id, cavity_count: 2, design_life_shots: 200000, current_shot_count: 124500, pm_interval_shots: 20000, die_owner: 'customer_owned', current_status: 'in_production', machine_id: machine.id, location: 'Shop Floor Bay 1' }
  });
  console.log('Die:', die.id);

  const bom = await prisma.bomHeader.upsert({
    where: { tenant_id_item_id_bom_revision: { tenant_id: tenant.id, item_id: item.id, bom_revision: 'B' } },
    update: {},
    create: {
      tenant_id: tenant.id, item_id: item.id, bom_revision: 'B', status: 'active',
      bom_lines: { create: [{ tenant_id: tenant.id, component_item_id: item.id, quantity_per: 1.82, unit_of_measure: 'KG', yield_factor: 0.76, scrap_percent: 24, line_type: 'material' }] }
    }
  });
  console.log('BOM:', bom.id);

  const routing = await prisma.routingHeader.upsert({
    where: { tenant_id_item_id_routing_revision: { tenant_id: tenant.id, item_id: item.id, routing_revision: 'A' } },
    update: {},
    create: {
      tenant_id: tenant.id, item_id: item.id, routing_revision: 'A', status: 'active',
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

  const po = await prisma.purchaseOrder.upsert({
    where: { tenant_id_po_number: { tenant_id: tenant.id, po_number: 'PO-2026-0001' } },
    update: {},
    create: {
      tenant_id: tenant.id, po_number: 'PO-2026-0001', supplier_id: supplier.id,
      expected_delivery_date: new Date('2026-05-24'), status: 'approved', notes: 'Urgent - stock below reorder point',
      po_lines: { create: [{ tenant_id: tenant.id, item_id: item.id, quantity_ordered: 3000, unit_price: 187, uom: 'KG' }] }
    }
  });
  console.log('PO:', po.id);

  const grn = await prisma.grnHeader.upsert({
    where: { tenant_id_grn_number: { tenant_id: tenant.id, grn_number: 'GRN-2026-0001' } },
    update: {},
    create: {
      tenant_id: tenant.id, grn_number: 'GRN-2026-0001', po_id: po.id, supplier_id: supplier.id,
      received_by: 'Storekeeper', vehicle_number: 'TN07AB1234', supplier_dc_number: 'HDC-2026-789',
      grn_lines: { create: [{ tenant_id: tenant.id, item_id: item.id, quantity_received: 3000, accepted_qty: 2980, rejected_qty: 20, rejection_reason: 'Surface contamination', batch_number: 'BATCH-ADC12-001', lot_number: 'LOT-2026-05', unit_price: 187 }] }
    }
  });
  console.log('GRN:', grn.id);

  await prisma.stockLedger.create({
    data: { tenant_id: tenant.id, item_id: item.id, transaction_type: 'receipt', quantity: 2980, unit_cost: 187, reference_type: 'grn', reference_id: grn.id, batch_number: 'BATCH-ADC12-001', lot_number: 'LOT-2026-05' }
  });
  console.log('Stock ledger updated');

  const jobcard = await prisma.jobCard.upsert({
    where: { tenant_id_job_number: { tenant_id: tenant.id, job_number: 'JC-2026-0001' } },
    update: {},
    create: { tenant_id: tenant.id, job_number: 'JC-2026-0001', item_id: item.id, bom_id: bom.id, routing_id: routing.id, machine_id: machine.id, die_id: die.id, planned_quantity: 540, shift: 'Morning', planned_date: new Date('2026-05-21'), status: 'in_progress', actual_start: new Date() }
  });
  console.log('Job card:', jobcard.id);

  const so = await prisma.salesOrder.upsert({
    where: { tenant_id_so_number: { tenant_id: tenant.id, so_number: 'SO-2026-0001' } },
    update: {},
    create: {
      tenant_id: tenant.id, so_number: 'SO-2026-0001', customer_name: 'Bajaj Auto', delivery_date: new Date('2026-05-23'),
      so_lines: { create: [{ tenant_id: tenant.id, item_id: item.id, quantity_ordered: 800, unit_price: 450, uom: 'PCS' }] }
    },
    include: { so_lines: true }
  });
  console.log('Sales order:', so.id);

  console.log('');
  console.log('=== SEED COMPLETE ===');
  console.log('Tenant ID:', tenant.id);
  console.log('Item ID:', item.id);
  console.log('Machine ID:', machine.id);
  console.log('Die ID:', die.id);
  console.log('BOM ID:', bom.id);
  console.log('Routing ID:', routing.id);
  console.log('Job Card ID:', jobcard.id);
  console.log('SO ID:', so.id);
}

seed().catch(console.error).finally(() => prisma.$disconnect());