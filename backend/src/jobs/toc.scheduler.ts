import prisma from '../config/prisma';

export async function runTOCSchedule(tenant_id: string) {
  console.log(`[TOC Scheduler] Running for tenant: ${tenant_id}`);
  const alerts: any[] = [];

  const machines = await prisma.machineMaster.findMany({
    where: { tenant_id, is_active: true }
  });

  const machineLoads = await Promise.all(
    machines.map(async (machine: any) => {
      const ops = await prisma.jobCardOperation.findMany({
        where: { tenant_id, machine_id: machine.id, status: { in: ['pending', 'in_progress'] } },
        include: { job: true }
      });
      const totalWorkSec = ops.reduce((sum: number, op: any) => {
        const cycleTime = machine.rated_cycle_time_sec ?? 48;
        return sum + (op.job.planned_quantity * cycleTime);
      }, 0);
      const availableSecPerDay = 8 * 3600;
      const loadPercent = Math.round((totalWorkSec / availableSecPerDay) * 100);
      return { machine_id: machine.id, machine_name: machine.machine_name, total_work_sec: totalWorkSec, load_percent: loadPercent };
    })
  );

  machineLoads.sort((a: any, b: any) => b.load_percent - a.load_percent);
  const detectedConstraint = machineLoads[0];
  if (!detectedConstraint) { console.log(`[TOC Scheduler] No machines found`); return; }

  const currentConstraint = await prisma.constraintConfig.findFirst({ where: { tenant_id, is_active_constraint: true } });

  if (!currentConstraint || currentConstraint.machine_id !== detectedConstraint.machine_id) {
    await prisma.constraintConfig.updateMany({ where: { tenant_id, is_active_constraint: true }, data: { is_active_constraint: false, effective_to: new Date() } });
    await prisma.constraintConfig.create({ data: { tenant_id, machine_id: detectedConstraint.machine_id, is_active_constraint: true, buffer_target_hours: currentConstraint?.buffer_target_hours ?? 4, effective_from: new Date() } });
    await prisma.machineMaster.updateMany({ where: { tenant_id }, data: { is_constraint: false } });
    await prisma.machineMaster.updateMany({ where: { id: detectedConstraint.machine_id, tenant_id }, data: { is_constraint: true } });
    alerts.push({ alert_type: 'constraint_shift', severity: 'info', message: `Constraint auto-updated to ${detectedConstraint.machine_name} at ${detectedConstraint.load_percent}% load` });
    await prisma.agentActionLog.create({ data: { tenant_id, agent_type: 'toc_scheduler', action_taken: `constraint_shift — ${detectedConstraint.machine_name}`, status: 'completed' } });
  }

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const constraintMachine = await prisma.machineMaster.findFirst({ where: { id: detectedConstraint.machine_id } });
  const cycleTimeSec = (constraintMachine as any)?.rated_cycle_time_sec ?? 48;

  const todayOps = await prisma.jobCardOperation.findMany({
    where: { tenant_id, machine_id: detectedConstraint.machine_id, status: { in: ['pending', 'in_progress'] }, job: { planned_date: { gte: startOfDay, lte: endOfDay } } },
    include: { job: true }
  });

  const totalConstraintHoursNeeded = todayOps.reduce((sum: number, op: any) => sum + (op.job.planned_quantity * cycleTimeSec) / 3600, 0);
  const overloadHours = totalConstraintHoursNeeded - 8;
  if (overloadHours > 0) {
    alerts.push({ alert_type: 'constraint_overload', severity: 'critical', message: `Constraint overloaded by ${Math.round(overloadHours * 10) / 10} hours today. Review job card schedule immediately.` });
  }

  const activeJobs = await prisma.jobCard.findMany({
    where: { tenant_id, status: { in: ['planned', 'released', 'in_progress'] } },
    include: { job_operations: { orderBy: { operation_sequence: 'asc' } }, item: true }
  });

  const jobsAtConstraint: any[] = [];
  for (const job of activeJobs) {
    const constraintOp = job.job_operations.find((op: any) => op.machine_id === detectedConstraint.machine_id && op.status === 'pending');
    if (!constraintOp) continue;
    const item = job.item as any;
    if (item?.selling_price && item?.material_cost) {
      const throughputPerHour = Math.round((item.selling_price - item.material_cost) / (cycleTimeSec / 3600));
      jobsAtConstraint.push({ job_id: job.id, job_number: (job as any).job_number, throughput_per_hour: throughputPerHour });
    }
  }

  if (jobsAtConstraint.length > 1) {
    const sorted = [...jobsAtConstraint].sort((a, b) => b.throughput_per_hour - a.throughput_per_hour);
    const gain = (sorted[0]?.throughput_per_hour || 0) - (jobsAtConstraint[0]?.throughput_per_hour || 0);
    if (gain > 0) {
      alerts.push({ alert_type: 'priority_sequence_suboptimal', severity: 'info', message: `Priority queue suboptimal. Running ${jobsAtConstraint[0]?.job_number} first instead of ${sorted[0]?.job_number} costs ₹${gain.toLocaleString('en-IN')}/hr in throughput.` });
    }
  }

  for (const job of activeJobs) {
    const ops = job.job_operations;
    const constraintOpIndex = ops.findIndex((op: any) => op.machine_id === detectedConstraint.machine_id);
    if (constraintOpIndex <= 0) continue;
    const opsBeforeConstraint = ops.slice(0, constraintOpIndex);
    const pendingOps = opsBeforeConstraint.filter((op: any) => op.status === 'pending');
    if (pendingOps.length > 0 && (job as any).planned_date) {
      const hoursToPlanned = (new Date((job as any).planned_date).getTime() - new Date().getTime()) / 3600000;
      if (hoursToPlanned < 3) {
        alerts.push({ alert_type: 'buffer_starvation_risk', severity: 'warning', message: `${(job as any).job_number} will starve constraint — ${pendingOps.length} upstream op(s) not started. Planned in ${Math.round(hoursToPlanned * 10) / 10} hours.` });
      }
    }
  }

  const pendingJWOs = await prisma.jobWorkOrder.findMany({
    where: { tenant_id, status: { in: ['draft', 'sent'] } },
    include: { vendor: true, job_card: true }
  });

  for (const jwo of pendingJWOs) {
    const jobCard = jwo.job_card as any;
    if (!jobCard?.planned_date) continue;
    const hoursToPlanned = (new Date(jobCard.planned_date).getTime() - new Date().getTime()) / 3600000;
    const vendorName = (jwo.vendor as any)?.vendor_name;
    if (hoursToPlanned < 24) {
      alerts.push({ alert_type: 'outsourced_op_at_risk', severity: 'critical', message: `Job Work Order for ${jobCard.job_number} not confirmed by ${vendorName}. Job hits constraint in less than 24 hours.` });
    } else if (hoursToPlanned < 48) {
      alerts.push({ alert_type: 'outsourced_op_at_risk', severity: 'warning', message: `Job Work Order for ${jobCard.job_number} not confirmed by ${vendorName}. Job hits constraint in less than 48 hours.` });
    }
  }

  const stockLedger = await prisma.stockLedger.groupBy({ by: ['item_id'], where: { tenant_id }, _sum: { quantity: true } });
  const getStock = (item_id: string) => stockLedger.find((l: any) => l.item_id === item_id)?._sum?.quantity ?? 0;

  for (const job of activeJobs) {
    if (!(job as any).bom_id) continue;
    const assemblyOp = job.job_operations.find((op: any) => op.operation_type === 'assembly');
    if (!assemblyOp || assemblyOp.status === 'completed') continue;
    const assemblyComponents = await prisma.bomLine.findMany({ where: { bom_id: (job as any).bom_id, line_type: 'assembly_component' } });
    for (const component of assemblyComponents) {
      const required = component.quantity_per * (job as any).planned_quantity;
      const available = getStock(component.component_item_id);
      if (available < required) {
        const item = await prisma.itemMaster.findUnique({ where: { id: component.component_item_id } });
        alerts.push({ alert_type: 'assembly_component_shortage', severity: 'warning', message: `${(job as any).job_number} — assembly component ${item?.item_name} insufficient. Need ${required}, have ${available}.` });
      }
    }
  }

  const openOrders = await prisma.salesOrder.findMany({ where: { tenant_id, status: 'open' }, include: { so_lines: true } });
  for (const so of openOrders) {
    if (!(so as any).delivery_date) continue;
    const hoursToDelivery = (new Date((so as any).delivery_date).getTime() - new Date().getTime()) / 3600000;
    if (hoursToDelivery < 0) {
      alerts.push({ alert_type: 'delivery_overdue', severity: 'critical', message: `${(so as any).so_number} — ${(so as any).customer_name} delivery is OVERDUE.` });
    } else if (hoursToDelivery < 24) {
      const remaining = (so as any).so_lines.reduce((s: number, l: any) => s + l.quantity_ordered - (l.quantity_dispatched || 0), 0);
      if (remaining > 0) alerts.push({ alert_type: 'delivery_at_risk', severity: 'critical', message: `${(so as any).so_number} — ${(so as any).customer_name} due tomorrow. ${remaining} pcs not dispatched.` });
    } else if (hoursToDelivery < 48) {
      alerts.push({ alert_type: 'delivery_at_risk', severity: 'warning', message: `${(so as any).so_number} — ${(so as any).customer_name} due in less than 48 hours.` });
    }
  }

  for (const alert of alerts) {
    await prisma.systemAlert.create({ data: { tenant_id, alert_type: alert.alert_type, severity: alert.severity, message: alert.message, reference_type: 'toc_scheduler', reference_id: tenant_id } });
  }

  await prisma.agentActionLog.create({ data: { tenant_id, agent_type: 'toc_scheduler', action_taken: `scheduled_run — ${alerts.length} alerts generated`, status: 'completed' } });
  console.log(`[TOC Scheduler] Done. Alerts: ${alerts.length}`);
  return { alerts_generated: alerts.length, constraint: detectedConstraint.machine_name };
}

export async function runTOCForAllTenants() {
  const tenants = await prisma.tenant.findMany({ where: { is_active: true } });
  for (const tenant of tenants) {
    await runTOCSchedule(tenant.id);
  }
}
