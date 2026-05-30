import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getOwnerDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const configs = await prisma.costConfig.findMany({ where: { tenant_id } });
    const getConfig = (key: string) => configs.find((c: any) => c.config_key === key)?.config_value ?? 0;
    const energyRate = getConfig('energy_rate_per_kwh');
    const operatorRate = getConfig('operator_rate_per_shift');
    const scrapRate = getConfig('scrap_rate_per_kg');
    const opExpensePerShift = getConfig('operating_expense_per_shift');

    const todayJobs = await prisma.jobCard.findMany({
      where: { tenant_id, planned_date: { gte: startOfDay, lte: endOfDay } },
      include: {
        job_operations: true,
        material_issues: { include: { item: true } },
        shot_logs: true,
        downtime_logs: true,
        rejection_logs: true
      }
    });

    let totalMaterialCost = 0;
    let totalEnergyCost = 0;
    let totalLabourCost = 0;
    let totalScrapRecovery = 0;
    let totalGoodParts = 0;
    let totalRejections = 0;
    let totalShots = 0;
    let totalDowntimeMin = 0;

    for (const job of todayJobs as any[]) {
      totalGoodParts += job.actual_quantity_good;
      totalShots += job.shot_logs.length;
      totalRejections += job.rejection_logs.length;
      totalDowntimeMin += job.downtime_logs.reduce((s: number, d: any) => s + (d.duration_min || 0), 0);

      for (const issue of job.material_issues) {
        const avgCost = await prisma.stockLedger.aggregate({
          where: { tenant_id, item_id: issue.item_id, transaction_type: 'receipt' },
          _avg: { unit_cost: true }
        });
        totalMaterialCost += issue.issued_qty * (avgCost._avg.unit_cost ?? 0);
      }

      for (const op of job.job_operations) {
        if (op.machine_id) {
          const machine = await prisma.machineMaster.findUnique({ where: { id: op.machine_id } });
          if (machine) {
            const cycleTimeSec = (machine as any).rated_cycle_time_sec ?? 48;
            const durationHrs = (job.planned_quantity * cycleTimeSec) / 3600;
            const powerKw = (machine as any).power_kw ?? 0;
            totalEnergyCost += powerKw * durationHrs * energyRate;
            const operators = (op as any).operators_required ?? (machine as any).operators_required ?? 1;
            totalLabourCost += operators * operatorRate * (durationHrs / 8);
          }
        }
      }

      const item = job.item_id ? await prisma.itemMaster.findUnique({
        where: { id: job.item_id },
        include: { pfep_detail: true }
      }) : null;

      if (item && (item as any).pfep_detail) {
        const grossWt = (item as any).pfep_detail.gross_weight_kg ?? 0;
        const netWt = (item as any).pfep_detail.net_weight_kg ?? 0;
        totalScrapRecovery += (grossWt - netWt) * job.actual_quantity_good * scrapRate;
      }
    }

    const totalVariableCost = totalMaterialCost + totalEnergyCost + totalLabourCost - totalScrapRecovery;

    const fgItems = await prisma.itemMaster.findMany({
      where: { tenant_id, item_type: 'finished_goods', is_active: true }
    });

    const perPartSummary = await Promise.all(
      fgItems.map(async (item: any) => {
        const itemJobs = (todayJobs as any[]).filter((j: any) => j.item_id === item.id);
        const goodParts = itemJobs.reduce((s: number, j: any) => s + j.actual_quantity_good, 0);
        if (goodParts === 0) return null;
        const revenue = goodParts * (item.selling_price ?? 0);
        const varCost = goodParts * (item.benchmark_cost ?? 0);
        const throughput = revenue - varCost;
        return {
          item_code: item.item_code,
          item_name: item.item_name,
          good_parts: goodParts,
          selling_price: item.selling_price,
          variable_cost_per_part: item.benchmark_cost,
          throughput_per_part: (item.selling_price ?? 0) - (item.benchmark_cost ?? 0),
          total_revenue: Math.round(revenue),
          total_throughput: Math.round(throughput)
        };
      })
    );

    const validPerPart = perPartSummary.filter((p: any) => p !== null);
    const totalRevenue = validPerPart.reduce((s: number, p: any) => s + p.total_revenue, 0);
    const totalThroughput = totalRevenue - totalMaterialCost;
    const profit = totalThroughput - opExpensePerShift;

    const materialIssues = await prisma.materialIssue.findMany({
      where: { tenant_id, issued_at: { gte: startOfDay, lte: endOfDay } },
      include: { item: true }
    });

    const materialConsumed = materialIssues.reduce((acc: any, issue: any) => {
      const key = issue.item_id;
      if (!acc[key]) {
        acc[key] = {
          item_code: issue.item.item_code,
          item_name: issue.item.item_name,
          unit: issue.item.unit_of_measure,
          quantity: 0
        };
      }
      acc[key].quantity += issue.issued_qty;
      return acc;
    }, {});

    const dispatches = await prisma.dispatchHeader.findMany({
      where: { tenant_id },
      include: { dispatch_lines: { include: { item: true } } }
    });
    const totalReceivables = dispatches.reduce((sum: number, d: any) =>
      sum + d.dispatch_lines.reduce((s: number, l: any) =>
        s + l.quantity_dispatched * ((l.item as any).selling_price ?? 0), 0), 0);

    const grns = await prisma.grnHeader.findMany({
      where: { tenant_id },
      include: { grn_lines: true }
    });
    const totalPayables = grns.reduce((sum: number, g: any) =>
      sum + g.grn_lines.reduce((s: number, l: any) =>
        s + l.quantity_received * (l.unit_price ?? 0), 0), 0);

    const constraint = await prisma.machineMaster.findFirst({
      where: { tenant_id, is_constraint: true }
    });

    const shiftMin = 480;
    const availability = Math.round(((shiftMin - totalDowntimeMin) / shiftMin) * 100);
    const quality = totalShots > 0 ? Math.round((totalGoodParts / totalShots) * 100) : 0;

    const alerts = await prisma.systemAlert.findMany({
      where: { tenant_id, is_resolved: false },
      orderBy: [{ severity: 'desc' }, { created_at: 'desc' }],
      take: 5
    });

    const dies = await prisma.dieMaster.findMany({
      where: { tenant_id, current_status: 'in_production' }
    });

    const dieHealth = dies.map((die: any) => {
      const shotsSincePM = die.current_shot_count - die.shots_at_last_pm;
      const pmInterval = die.pm_interval_shots ?? 20000;
      return {
        die_number: die.die_number,
        shots_to_pm: pmInterval - shotsSincePM,
        pm_status: (shotsSincePM / pmInterval) >= 0.9 ? 'critical' :
          (shotsSincePM / pmInterval) >= 0.75 ? 'warning' : 'healthy'
      };
    });

    res.json({
      success: true,
      disclaimer: 'Variable cost only. Excludes depreciation, rent, and admin overhead.',
      data: {
        date: startOfDay,
        production: {
          total_good_parts: totalGoodParts,
          total_shots: totalShots,
          total_rejections: totalRejections,
          rejection_rate_percent: totalShots > 0 ? Math.round((totalRejections / totalShots) * 100 * 10) / 10 : 0,
          downtime_minutes: totalDowntimeMin,
          availability_percent: availability,
          quality_percent: quality
        },
        financials: {
          total_revenue: Math.round(totalRevenue),
          total_variable_cost: Math.round(totalVariableCost),
          breakdown: {
            material_cost: Math.round(totalMaterialCost),
            energy_cost: Math.round(totalEnergyCost),
            labour_cost: Math.round(totalLabourCost),
            scrap_recovery: Math.round(totalScrapRecovery)
          },
          total_throughput: Math.round(totalThroughput),
          operating_expense: opExpensePerShift,
          profit: Math.round(profit),
          profit_note: 'Profit = Throughput minus operating expense per shift'
        },
        per_part_summary: validPerPart,
        material_consumed: Object.values(materialConsumed),
        waste: {
          rejection_cost: Math.round(totalRejections * (totalVariableCost / (totalGoodParts || 1))),
          downtime_minutes: totalDowntimeMin
        },
        cash_position: {
          total_receivables: Math.round(totalReceivables),
          total_payables: Math.round(totalPayables),
          net_position: Math.round(totalReceivables - totalPayables),
          note: 'Cumulative totals. Integrate with Tally for aging analysis.'
        },
        factory_health: {
          constraint_machine: constraint?.machine_name,
          availability_percent: availability,
          quality_percent: quality,
          active_alerts: alerts.length,
          alerts,
          die_health: dieHealth
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
