import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function getConfig(tenant_id: string, key: string) {
  const config = await prisma.costConfig.findFirst({ where: { tenant_id, config_key: key } });
  return config?.config_value ?? 0;
}

async function getMonthRange(month: number, year: number) {
  const from = new Date(year, month - 1, 1, 0, 0, 0);
  const to = new Date(year, month, 0, 23, 59, 59);
  return { from, to };
}

async function getVariableCostForPeriod(tenant_id: string, from: Date, to: Date) {
  const energyRate = await getConfig(tenant_id, 'energy_rate_per_kwh');
  const operatorRate = await getConfig(tenant_id, 'operator_rate_per_shift');
  const scrapRate = await getConfig(tenant_id, 'scrap_rate_per_kg');

  const jobs = await prisma.jobCard.findMany({
    where: { tenant_id, planned_date: { gte: from, lte: to } },
    include: {
      job_operations: true,
      material_issues: { include: { item: true } }
    }
  });

  let materialCost = 0;
  let energyCost = 0;
  let labourCost = 0;
  let scrapRecovery = 0;
  let goodParts = 0;

  for (const job of jobs) {
    goodParts += job.actual_quantity_good;

    for (const issue of (job as any).material_issues) {
      const avgCost = await prisma.stockLedger.aggregate({
        where: { tenant_id, item_id: issue.item_id, transaction_type: 'receipt' },
        _avg: { unit_cost: true }
      });
      materialCost += issue.issued_qty * (avgCost._avg.unit_cost ?? 0);
    }

    for (const op of (job as any).job_operations) {
      if (op.machine_id) {
        const machine = await prisma.machineMaster.findUnique({ where: { id: op.machine_id } });
        if (machine) {
          const cycleTimeSec = (machine as any).rated_cycle_time_sec ?? 48;
          const durationHrs = (job.planned_quantity * cycleTimeSec) / 3600;
          const powerKw = (machine as any).power_kw ?? 0;
          energyCost += powerKw * durationHrs * energyRate;
          const operators = (op as any).operators_required ?? (machine as any).operators_required ?? 1;
          labourCost += operators * operatorRate * (durationHrs / 8);
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
      scrapRecovery += (grossWt - netWt) * job.actual_quantity_good * scrapRate;
    }
  }

  const totalVariableCost = materialCost + energyCost + labourCost - scrapRecovery;

  return {
    material_cost: Math.round(materialCost),
    energy_cost: Math.round(energyCost),
    labour_cost: Math.round(labourCost),
    scrap_recovery: Math.round(scrapRecovery),
    total_variable_cost: Math.round(totalVariableCost),
    good_parts: goodParts
  };
}

async function getRevenueForPeriod(tenant_id: string, from: Date, to: Date) {
  const invoices = await prisma.invoiceHeader.findMany({
    where: { tenant_id, invoice_date: { gte: from, lte: to }, status: { not: 'reversed' as string } }
  });
  const creditNotes = await prisma.creditNote.findMany({
    where: { tenant_id, cn_date: { gte: from, lte: to } }
  });
  const grossRevenue = invoices.reduce((s: number, i: any) => s + i.subtotal, 0);
  const cnTotal = creditNotes.reduce((s: number, cn: any) => s + cn.subtotal, 0);
  return {
    gross_revenue: Math.round(grossRevenue),
    credit_notes: Math.round(cnTotal),
    net_revenue: Math.round(grossRevenue - cnTotal),
    invoice_count: invoices.length
  };
}

async function getOpexForPeriod(tenant_id: string, from: Date, to: Date) {
  const expenses = await prisma.expenseEntry.findMany({
    where: { tenant_id, expense_date: { gte: from, lte: to }, is_reversed: false }
  });

  const byCategory = expenses.reduce((acc: any, exp: any) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  const total = expenses.reduce((s: number, e: any) => s + e.amount, 0);
  return { total: Math.round(total), by_category: byCategory };
}

async function getDepreciationForMonth(tenant_id: string) {
  const assets = await prisma.fixedAsset.findMany({ where: { tenant_id, is_active: true } });
  const totalMonthlyDep = assets.reduce((s: number, a: any) => s + (a.monthly_depreciation ?? 0), 0);
  return {
    total: Math.round(totalMonthlyDep),
    assets: assets.map((a: any) => ({
      asset_name: a.asset_name,
      monthly_depreciation: a.monthly_depreciation ?? 0
    }))
  };
}

async function getInterestForMonth(tenant_id: string) {
  const loans = await prisma.loanAccount.findMany({ where: { tenant_id, is_active: true } });
  const totalMonthlyInterest = loans.reduce((s: number, l: any) => {
    return s + (l.outstanding_amount * l.interest_rate / 100 / 12);
  }, 0);
  return {
    total: Math.round(totalMonthlyInterest),
    loans: loans.map((l: any) => ({
      loan_name: l.loan_name,
      monthly_interest: Math.round(l.outstanding_amount * l.interest_rate / 100 / 12)
    }))
  };
}

// ─── REPORT 1 — DAILY THROUGHPUT ─────────────────────────────────────────────

export const getDailyThroughput = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const dateStr = req.query.date ? String(req.query.date) : new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);
    const from = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const to = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    const opex = await getConfig(tenant_id, 'operating_expense_per_shift');
    const revenue = await getRevenueForPeriod(tenant_id, from, to);
    const variableCost = await getVariableCostForPeriod(tenant_id, from, to);

    const throughput = revenue.net_revenue - variableCost.total_variable_cost;
    const ebitda = throughput - opex;

    const jobs = await prisma.jobCard.findMany({
      where: { tenant_id, planned_date: { gte: from, lte: to } },
      include: { shot_logs: true, downtime_logs: true, rejection_logs: true }
    });

    const totalPlanned = jobs.reduce((s: number, j: any) => s + j.planned_quantity, 0);
    const totalGood = jobs.reduce((s: number, j: any) => s + j.actual_quantity_good, 0);
    const totalShots = jobs.reduce((s: number, j: any) => s + j.shot_logs.length, 0);
    const totalRejections = jobs.reduce((s: number, j: any) => s + j.rejection_logs.length, 0);
    const totalDowntime = jobs.reduce((s: number, j: any) =>
      s + j.downtime_logs.reduce((ds: number, d: any) => ds + (d.duration_min || 0), 0), 0);

    const rejectionCost = totalRejections > 0 && variableCost.good_parts > 0
      ? Math.round(totalRejections * (variableCost.total_variable_cost / variableCost.good_parts))
      : 0;

    res.json({
      success: true,
      data: {
        date: from,
        disclaimer: 'Variable cost basis. Excludes depreciation and admin overhead.',
        production: {
          planned_qty: totalPlanned,
          good_parts: totalGood,
          total_shots: totalShots,
          total_rejections: totalRejections,
          rejection_rate: totalShots > 0 ? Math.round((totalRejections / totalShots) * 100 * 10) / 10 : 0,
          downtime_minutes: totalDowntime,
          achievement_percent: totalPlanned > 0 ? Math.round((totalGood / totalPlanned) * 100) : 0
        },
        financials: {
          gross_revenue: revenue.gross_revenue,
          credit_notes: revenue.credit_notes,
          net_revenue: revenue.net_revenue,
          variable_cost: {
            material: variableCost.material_cost,
            energy: variableCost.energy_cost,
            labour: variableCost.labour_cost,
            scrap_recovery: variableCost.scrap_recovery,
            total: variableCost.total_variable_cost
          },
          throughput: throughput,
          throughput_percent: revenue.net_revenue > 0 ? Math.round((throughput / revenue.net_revenue) * 100) : 0,
          operating_expense: Math.round(opex),
          ebitda: Math.round(ebitda),
          ebitda_percent: revenue.net_revenue > 0 ? Math.round((ebitda / revenue.net_revenue) * 100) : 0
        },
        waste: {
          rejection_cost: rejectionCost,
          downtime_minutes: totalDowntime
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── REPORT 2 — MONTHLY THROUGHPUT ───────────────────────────────────────────

export const getMonthlyThroughput = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const month = req.query.month ? parseInt(String(req.query.month)) : new Date().getMonth() + 1;
    const year = req.query.year ? parseInt(String(req.query.year)) : new Date().getFullYear();
    const { from, to } = await getMonthRange(month, year);

    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayFrom = new Date(year, month - 1, day, 0, 0, 0);
      const dayTo = new Date(year, month - 1, day, 23, 59, 59);

      const dayRevenue = await getRevenueForPeriod(tenant_id, dayFrom, dayTo);
      const dayVarCost = await getVariableCostForPeriod(tenant_id, dayFrom, dayTo);
      const dayJobs = await prisma.jobCard.findMany({
        where: { tenant_id, planned_date: { gte: dayFrom, lte: dayTo } },
        include: { shot_logs: true }
      });

      const dayGoodParts = dayJobs.reduce((s: number, j: any) => s + j.actual_quantity_good, 0);
      const dayThroughput = dayRevenue.net_revenue - dayVarCost.total_variable_cost;

      dailyData.push({
        day,
        date: dayFrom,
        good_parts: dayGoodParts,
        revenue: dayRevenue.net_revenue,
        variable_cost: dayVarCost.total_variable_cost,
        throughput: dayThroughput,
        throughput_percent: dayRevenue.net_revenue > 0
          ? Math.round((dayThroughput / dayRevenue.net_revenue) * 100) : 0
      });
    }

    const monthRevenue = await getRevenueForPeriod(tenant_id, from, to);
    const monthVarCost = await getVariableCostForPeriod(tenant_id, from, to);
    const monthThroughput = monthRevenue.net_revenue - monthVarCost.total_variable_cost;

    const fgItems = await prisma.itemMaster.findMany({
      where: { tenant_id, item_type: 'finished_goods', is_active: true }
    });

    const byProduct = await Promise.all(fgItems.map(async (item: any) => {
      const itemJobs = await prisma.jobCard.findMany({
        where: { tenant_id, item_id: item.id, planned_date: { gte: from, lte: to } }
      });
      const goodParts = itemJobs.reduce((s: number, j: any) => s + j.actual_quantity_good, 0);
      if (goodParts === 0) return null;
      const revenue = goodParts * (item.selling_price ?? 0);
      const varCost = goodParts * (item.material_cost ?? 0);
      return {
        item_name: item.item_name,
        item_code: item.item_code,
        good_parts: goodParts,
        revenue: Math.round(revenue),
        variable_cost: Math.round(varCost),
        throughput: Math.round(revenue - varCost),
        throughput_percent: revenue > 0 ? Math.round(((revenue - varCost) / revenue) * 100) : 0
      };
    }));

    const sortedDaily = [...dailyData].sort((a, b) => b.throughput - a.throughput);

    res.json({
      success: true,
      data: {
        period: { month, year },
        summary: {
          net_revenue: monthRevenue.net_revenue,
          variable_cost: monthVarCost.total_variable_cost,
          throughput: Math.round(monthThroughput),
          throughput_percent: monthRevenue.net_revenue > 0
            ? Math.round((monthThroughput / monthRevenue.net_revenue) * 100) : 0,
          good_parts: monthVarCost.good_parts
        },
        daily_data: dailyData,
        top_3_days: sortedDaily.slice(0, 3),
        bottom_3_days: sortedDaily.slice(-3).reverse(),
        by_product: byProduct.filter(p => p !== null)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── REPORT 3 — MONTHLY OPERATING STATEMENT ──────────────────────────────────

export const getMonthlyOperatingStatement = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const month = req.query.month ? parseInt(String(req.query.month)) : new Date().getMonth() + 1;
    const year = req.query.year ? parseInt(String(req.query.year)) : new Date().getFullYear();
    const { from, to } = await getMonthRange(month, year);

    const revenue = await getRevenueForPeriod(tenant_id, from, to);
    const varCost = await getVariableCostForPeriod(tenant_id, from, to);
    const opex = await getOpexForPeriod(tenant_id, from, to);
    const depreciation = await getDepreciationForMonth(tenant_id);
    const interest = await getInterestForMonth(tenant_id);
    const taxRate = await getConfig(tenant_id, 'income_tax_rate');

    const throughput = revenue.net_revenue - varCost.total_variable_cost;
    const ebitda = throughput - opex.total;
    const ebit = ebitda - depreciation.total;
    const ebt = ebit - interest.total;
    const taxAmount = ebt > 0 ? Math.round(ebt * taxRate / 100) : 0;
    const netProfit = ebt - taxAmount;

    res.json({
      success: true,
      data: {
        period: { month, year },
        disclaimer: 'Management P&L — Variable cost basis.',
        revenue: {
          gross_revenue: revenue.gross_revenue,
          credit_notes: revenue.credit_notes,
          net_revenue: revenue.net_revenue,
          invoice_count: revenue.invoice_count
        },
        variable_cost: {
          material: varCost.material_cost,
          energy: varCost.energy_cost,
          labour: varCost.labour_cost,
          scrap_recovery: varCost.scrap_recovery,
          total: varCost.total_variable_cost
        },
        throughput: {
          amount: Math.round(throughput),
          percent: revenue.net_revenue > 0 ? Math.round((throughput / revenue.net_revenue) * 100) : 0
        },
        operating_expenses: {
          total: opex.total,
          by_category: opex.by_category
        },
        ebitda: {
          amount: Math.round(ebitda),
          percent: revenue.net_revenue > 0 ? Math.round((ebitda / revenue.net_revenue) * 100) : 0,
          configured: true
        },
        depreciation: {
          amount: depreciation.total,
          assets: depreciation.assets,
          configured: depreciation.total > 0
        },
        ebit: {
          amount: Math.round(ebit),
          percent: revenue.net_revenue > 0 ? Math.round((ebit / revenue.net_revenue) * 100) : 0
        },
        interest: {
          amount: interest.total,
          loans: interest.loans,
          configured: interest.total > 0
        },
        ebt: {
          amount: Math.round(ebt),
          percent: revenue.net_revenue > 0 ? Math.round((ebt / revenue.net_revenue) * 100) : 0
        },
        tax: {
          rate: taxRate,
          amount: taxAmount,
          configured: taxRate > 0
        },
        net_profit: {
          amount: Math.round(netProfit),
          percent: revenue.net_revenue > 0 ? Math.round((netProfit / revenue.net_revenue) * 100) : 0
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── REPORT 4 — MONTHLY FINANCE STATEMENT ────────────────────────────────────

export const getMonthlyFinanceStatement = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const month = req.query.month ? parseInt(String(req.query.month)) : new Date().getMonth() + 1;
    const year = req.query.year ? parseInt(String(req.query.year)) : new Date().getFullYear();
    const { from, to } = await getMonthRange(month, year);

    const revenue = await getRevenueForPeriod(tenant_id, from, to);
    const varCost = await getVariableCostForPeriod(tenant_id, from, to);
    const opex = await getOpexForPeriod(tenant_id, from, to);
    const depreciation = await getDepreciationForMonth(tenant_id);
    const interest = await getInterestForMonth(tenant_id);
    const taxRate = await getConfig(tenant_id, 'income_tax_rate');

    const throughput = revenue.net_revenue - varCost.total_variable_cost;
    const ebitda = throughput - opex.total;
    const ebit = ebitda - depreciation.total;
    const ebt = ebit - interest.total;
    const taxAmount = ebt > 0 ? Math.round(ebt * taxRate / 100) : 0;
    const netProfit = ebt - taxAmount;

    const bankAccounts = await prisma.bankAccount.findMany({ where: { tenant_id, is_active: true } });
    const bankBalance = bankAccounts.reduce((s: number, a: any) => s + a.current_balance, 0);

    const receipts = await prisma.paymentReceipt.findMany({
      where: { tenant_id, receipt_date: { gte: from, lte: to }, status: 'received' }
    });
    const totalReceipts = receipts.reduce((s: number, r: any) => s + r.amount_received, 0);

    const vouchers = await prisma.paymentVoucher.findMany({
      where: { tenant_id, voucher_date: { gte: from, lte: to }, status: 'paid' }
    });
    const totalVouchers = vouchers.reduce((s: number, v: any) => s + v.amount_paid, 0);

    const monthExpensePaid = opex.total;

    const outstandingReceivables = await prisma.invoiceHeader.findMany({
      where: { tenant_id, status: { in: ['sent', 'partial', 'overdue'] as string[] } }
    });
    const totalReceivables = outstandingReceivables.reduce((s: number, i: any) => s + (i.total_amount - i.amount_paid), 0);

    const outstandingPayables = await prisma.supplierBill.findMany({
      where: { tenant_id, status: { in: ['pending', 'partial'] as string[] } }
    });
    const totalPayables = outstandingPayables.reduce((s: number, b: any) => s + (b.total_amount - b.amount_paid), 0);

    const gstData = await prisma.invoiceHeader.findMany({
      where: { tenant_id, invoice_date: { gte: from, lte: to }, status: { not: 'reversed' as string } }
    });
    const outputGST = gstData.reduce((s: number, i: any) => s + i.cgst_amount + i.sgst_amount + i.igst_amount, 0);

    const gstInput = await prisma.supplierBill.findMany({
      where: { tenant_id, bill_date: { gte: from, lte: to } }
    });
    const inputGST = gstInput.reduce((s: number, b: any) => s + b.cgst_amount + b.sgst_amount + b.igst_amount, 0);

    const overdueInvoices = outstandingReceivables.filter((i: any) => i.status === 'overdue');
    const overdueAmount = overdueInvoices.reduce((s: number, i: any) => s + (i.total_amount - i.amount_paid), 0);

    res.json({
      success: true,
      data: {
        period: { month, year },
        pl_summary: {
          net_revenue: revenue.net_revenue,
          throughput: Math.round(throughput),
          ebitda: Math.round(ebitda),
          ebit: Math.round(ebit),
          ebt: Math.round(ebt),
          net_profit: Math.round(netProfit),
          net_margin_percent: revenue.net_revenue > 0 ? Math.round((netProfit / revenue.net_revenue) * 100) : 0
        },
        cash_flow: {
          opening_balance: Math.round(bankBalance - totalReceipts + totalVouchers + monthExpensePaid),
          receipts_from_customers: Math.round(totalReceipts),
          payments_to_suppliers: Math.round(totalVouchers),
          operating_expenses_paid: Math.round(monthExpensePaid),
          closing_balance: Math.round(bankBalance),
          net_cash_flow: Math.round(totalReceipts - totalVouchers - monthExpensePaid)
        },
        balance_position: {
          bank_balance: Math.round(bankBalance),
          receivables_outstanding: Math.round(totalReceivables),
          payables_outstanding: Math.round(totalPayables),
          net_working_capital: Math.round(totalReceivables - totalPayables)
        },
        gst_position: {
          output_gst: Math.round(outputGST),
          input_gst_credit: Math.round(inputGST),
          net_gst_payable: Math.round(outputGST - inputGST)
        },
        aging_summary: {
          total_overdue: Math.round(overdueAmount),
          overdue_count: overdueInvoices.length
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── FIXED ASSETS ─────────────────────────────────────────────────────────────

export const getFixedAssets = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const assets = await prisma.fixedAsset.findMany({ where: { tenant_id, is_active: true }, orderBy: { created_at: 'desc' } });
    res.json({ success: true, data: assets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createFixedAsset = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { asset_name, asset_code, category, purchase_value, purchase_date, useful_life_years, salvage_value, depreciation_method, notes } = req.body;

    const annualDep = depreciation_method === 'straight_line'
      ? (purchase_value - (salvage_value || 0)) / useful_life_years
      : purchase_value * 0.15;

    const monthlyDep = annualDep / 12;
    const purchaseDate = new Date(purchase_date);
    const monthsElapsed = Math.floor((new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const accumulatedDep = Math.min(monthlyDep * monthsElapsed, purchase_value - (salvage_value || 0));
    const bookValue = purchase_value - accumulatedDep;

    const asset = await prisma.fixedAsset.create({
      data: {
        tenant_id, asset_name, asset_code, category,
        purchase_value, purchase_date: purchaseDate,
        useful_life_years, salvage_value: salvage_value || 0,
        depreciation_method: depreciation_method || 'straight_line',
        annual_depreciation: Math.round(annualDep),
        monthly_depreciation: Math.round(monthlyDep * 100) / 100,
        accumulated_depreciation: Math.round(accumulatedDep),
        current_book_value: Math.round(bookValue),
        notes
      }
    });

    res.status(201).json({ success: true, data: asset });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getLoanAccounts = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const loans = await prisma.loanAccount.findMany({ where: { tenant_id, is_active: true }, orderBy: { created_at: 'desc' } });
    res.json({ success: true, data: loans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createLoanAccount = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const loan = await prisma.loanAccount.create({
      data: {
        tenant_id,
        ...req.body,
        disbursement_date: req.body.disbursement_date ? new Date(req.body.disbursement_date) : null,
        maturity_date: req.body.maturity_date ? new Date(req.body.maturity_date) : null,
        next_due_date: req.body.next_due_date ? new Date(req.body.next_due_date) : null
      }
    });
    res.status(201).json({ success: true, data: loan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
