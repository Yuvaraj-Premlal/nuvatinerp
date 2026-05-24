"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupplierPerformance = exports.getDieHealthReport = exports.getRejectionTrend = exports.getCustomerOTIF = exports.getMonthlyProductionSummary = exports.getShiftReport = exports.createLoanAccount = exports.getLoanAccounts = exports.createFixedAsset = exports.getFixedAssets = exports.getMonthlyFinanceStatement = exports.getMonthlyOperatingStatement = exports.getMonthlyThroughput = exports.getDailyThroughput = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function getConfig(tenant_id, key) {
    const config = await prisma_1.default.costConfig.findFirst({ where: { tenant_id, config_key: key } });
    return config?.config_value ?? 0;
}
async function getMonthRange(month, year) {
    const from = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`);
    const daysInMonth = new Date(year, month, 0).getDate();
    const to = new Date(`${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}T23:59:59.999Z`);
    return { from, to };
}
async function getVariableCostForPeriod(tenant_id, from, to) {
    const energyRate = await getConfig(tenant_id, 'energy_rate_per_kwh');
    const operatorRate = await getConfig(tenant_id, 'operator_rate_per_shift');
    const scrapRate = await getConfig(tenant_id, 'scrap_rate_per_kg');
    const jobs = await prisma_1.default.jobCard.findMany({
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
        for (const issue of job.material_issues) {
            const avgCost = await prisma_1.default.stockLedger.aggregate({
                where: { tenant_id, item_id: issue.item_id, transaction_type: 'receipt' },
                _avg: { unit_cost: true }
            });
            materialCost += issue.issued_qty * (avgCost._avg.unit_cost ?? 0);
        }
        for (const op of job.job_operations) {
            if (op.machine_id) {
                const machine = await prisma_1.default.machineMaster.findUnique({ where: { id: op.machine_id } });
                if (machine) {
                    const cycleTimeSec = machine.rated_cycle_time_sec ?? 48;
                    const durationHrs = (job.planned_quantity * cycleTimeSec) / 3600;
                    const powerKw = machine.power_kw ?? 0;
                    energyCost += powerKw * durationHrs * energyRate;
                    const operators = op.operators_required ?? machine.operators_required ?? 1;
                    labourCost += operators * operatorRate * (durationHrs / 8);
                }
            }
        }
        const item = job.item_id ? await prisma_1.default.itemMaster.findUnique({
            where: { id: job.item_id },
            include: { pfep_detail: true }
        }) : null;
        if (item && item.pfep_detail) {
            const grossWt = item.pfep_detail.gross_weight_kg ?? 0;
            const netWt = item.pfep_detail.net_weight_kg ?? 0;
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
async function getRevenueForPeriod(tenant_id, from, to) {
    const invoices = await prisma_1.default.invoiceHeader.findMany({
        where: { tenant_id, invoice_date: { gte: from, lte: to }, status: { not: 'reversed' } }
    });
    const creditNotes = await prisma_1.default.creditNote.findMany({
        where: { tenant_id, cn_date: { gte: from, lte: to } }
    });
    const grossRevenue = invoices.reduce((s, i) => s + i.subtotal, 0);
    const cnTotal = creditNotes.reduce((s, cn) => s + cn.subtotal, 0);
    return {
        gross_revenue: Math.round(grossRevenue),
        credit_notes: Math.round(cnTotal),
        net_revenue: Math.round(grossRevenue - cnTotal),
        invoice_count: invoices.length
    };
}
async function getOpexForPeriod(tenant_id, from, to) {
    const expenses = await prisma_1.default.expenseEntry.findMany({
        where: { tenant_id, expense_date: { gte: from, lte: to }, is_reversed: false }
    });
    const byCategory = expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
    }, {});
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    return { total: Math.round(total), by_category: byCategory };
}
async function getDepreciationForMonth(tenant_id) {
    const assets = await prisma_1.default.fixedAsset.findMany({ where: { tenant_id, is_active: true } });
    const totalMonthlyDep = assets.reduce((s, a) => s + (a.monthly_depreciation ?? 0), 0);
    return {
        total: Math.round(totalMonthlyDep),
        assets: assets.map((a) => ({
            asset_name: a.asset_name,
            monthly_depreciation: a.monthly_depreciation ?? 0
        }))
    };
}
async function getInterestForMonth(tenant_id) {
    const loans = await prisma_1.default.loanAccount.findMany({ where: { tenant_id, is_active: true } });
    const totalMonthlyInterest = loans.reduce((s, l) => {
        return s + (l.outstanding_amount * l.interest_rate / 100 / 12);
    }, 0);
    return {
        total: Math.round(totalMonthlyInterest),
        loans: loans.map((l) => ({
            loan_name: l.loan_name,
            monthly_interest: Math.round(l.outstanding_amount * l.interest_rate / 100 / 12)
        }))
    };
}
// ─── REPORT 1 — DAILY THROUGHPUT ─────────────────────────────────────────────
const getDailyThroughput = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const dateStr = req.query.date ? String(req.query.date) : new Date().toISOString().split('T')[0];
        const from = new Date(`${dateStr}T00:00:00.000Z`);
        const to = new Date(`${dateStr}T23:59:59.999Z`);
        const opex = await getConfig(tenant_id, 'operating_expense_per_shift');
        const revenue = await getRevenueForPeriod(tenant_id, from, to);
        const variableCost = await getVariableCostForPeriod(tenant_id, from, to);
        const throughput = revenue.net_revenue - variableCost.total_variable_cost;
        const ebitda = throughput - opex;
        const jobs = await prisma_1.default.jobCard.findMany({
            where: { tenant_id, planned_date: { gte: from, lte: to } },
            include: { shot_logs: true, downtime_logs: true, rejection_logs: true }
        });
        const totalPlanned = jobs.reduce((s, j) => s + j.planned_quantity, 0);
        const totalGood = jobs.reduce((s, j) => s + j.actual_quantity_good, 0);
        const totalShots = jobs.reduce((s, j) => s + j.shot_logs.length, 0);
        const totalRejections = jobs.reduce((s, j) => s + j.rejection_logs.length, 0);
        const totalDowntime = jobs.reduce((s, j) => s + j.downtime_logs.reduce((ds, d) => ds + (d.duration_min || 0), 0), 0);
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getDailyThroughput = getDailyThroughput;
// ─── REPORT 2 — MONTHLY THROUGHPUT ───────────────────────────────────────────
const getMonthlyThroughput = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
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
            const dayJobs = await prisma_1.default.jobCard.findMany({
                where: { tenant_id, planned_date: { gte: dayFrom, lte: dayTo } },
                include: { shot_logs: true }
            });
            const dayGoodParts = dayJobs.reduce((s, j) => s + j.actual_quantity_good, 0);
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
        const fgItems = await prisma_1.default.itemMaster.findMany({
            where: { tenant_id, item_type: 'finished_goods', is_active: true }
        });
        const byProduct = await Promise.all(fgItems.map(async (item) => {
            const itemJobs = await prisma_1.default.jobCard.findMany({
                where: { tenant_id, item_id: item.id, planned_date: { gte: from, lte: to } }
            });
            const goodParts = itemJobs.reduce((s, j) => s + j.actual_quantity_good, 0);
            if (goodParts === 0)
                return null;
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getMonthlyThroughput = getMonthlyThroughput;
// ─── REPORT 3 — MONTHLY OPERATING STATEMENT ──────────────────────────────────
const getMonthlyOperatingStatement = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getMonthlyOperatingStatement = getMonthlyOperatingStatement;
// ─── REPORT 4 — MONTHLY FINANCE STATEMENT ────────────────────────────────────
const getMonthlyFinanceStatement = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
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
        const bankAccounts = await prisma_1.default.bankAccount.findMany({ where: { tenant_id, is_active: true } });
        const bankBalance = bankAccounts.reduce((s, a) => s + a.current_balance, 0);
        const receipts = await prisma_1.default.paymentReceipt.findMany({
            where: { tenant_id, receipt_date: { gte: from, lte: to }, status: 'received' }
        });
        const totalReceipts = receipts.reduce((s, r) => s + r.amount_received, 0);
        const vouchers = await prisma_1.default.paymentVoucher.findMany({
            where: { tenant_id, voucher_date: { gte: from, lte: to }, status: 'paid' }
        });
        const totalVouchers = vouchers.reduce((s, v) => s + v.amount_paid, 0);
        const monthExpensePaid = opex.total;
        const outstandingReceivables = await prisma_1.default.invoiceHeader.findMany({
            where: { tenant_id, status: { in: ['sent', 'partial', 'overdue'] } }
        });
        const totalReceivables = outstandingReceivables.reduce((s, i) => s + (i.total_amount - i.amount_paid), 0);
        const outstandingPayables = await prisma_1.default.supplierBill.findMany({
            where: { tenant_id, status: { in: ['pending', 'partial'] } }
        });
        const totalPayables = outstandingPayables.reduce((s, b) => s + (b.total_amount - b.amount_paid), 0);
        const gstData = await prisma_1.default.invoiceHeader.findMany({
            where: { tenant_id, invoice_date: { gte: from, lte: to }, status: { not: 'reversed' } }
        });
        const outputGST = gstData.reduce((s, i) => s + i.cgst_amount + i.sgst_amount + i.igst_amount, 0);
        const gstInput = await prisma_1.default.supplierBill.findMany({
            where: { tenant_id, bill_date: { gte: from, lte: to } }
        });
        const inputGST = gstInput.reduce((s, b) => s + b.cgst_amount + b.sgst_amount + b.igst_amount, 0);
        const overdueInvoices = outstandingReceivables.filter((i) => i.status === 'overdue');
        const overdueAmount = overdueInvoices.reduce((s, i) => s + (i.total_amount - i.amount_paid), 0);
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getMonthlyFinanceStatement = getMonthlyFinanceStatement;
// ─── FIXED ASSETS ─────────────────────────────────────────────────────────────
const getFixedAssets = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const assets = await prisma_1.default.fixedAsset.findMany({ where: { tenant_id, is_active: true }, orderBy: { created_at: 'desc' } });
        res.json({ success: true, data: assets });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getFixedAssets = getFixedAssets;
const createFixedAsset = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { asset_name, asset_code, category, purchase_value, purchase_date, useful_life_years, salvage_value, depreciation_method, notes } = req.body;
        const annualDep = depreciation_method === 'straight_line'
            ? (purchase_value - (salvage_value || 0)) / useful_life_years
            : purchase_value * 0.15;
        const monthlyDep = annualDep / 12;
        const purchaseDate = new Date(purchase_date);
        const monthsElapsed = Math.floor((new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
        const accumulatedDep = Math.min(monthlyDep * monthsElapsed, purchase_value - (salvage_value || 0));
        const bookValue = purchase_value - accumulatedDep;
        const asset = await prisma_1.default.fixedAsset.create({
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createFixedAsset = createFixedAsset;
const getLoanAccounts = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const loans = await prisma_1.default.loanAccount.findMany({ where: { tenant_id, is_active: true }, orderBy: { created_at: 'desc' } });
        res.json({ success: true, data: loans });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getLoanAccounts = getLoanAccounts;
const createLoanAccount = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const loan = await prisma_1.default.loanAccount.create({
            data: {
                tenant_id,
                ...req.body,
                disbursement_date: req.body.disbursement_date ? new Date(req.body.disbursement_date) : null,
                maturity_date: req.body.maturity_date ? new Date(req.body.maturity_date) : null,
                next_due_date: req.body.next_due_date ? new Date(req.body.next_due_date) : null
            }
        });
        res.status(201).json({ success: true, data: loan });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createLoanAccount = createLoanAccount;
// ─── SHIFT REPORT ─────────────────────────────────────────────────────────────
const getShiftReport = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const dateStr = req.query.date ? String(req.query.date) : new Date().toISOString().split('T')[0];
        const shift = req.query.shift ? String(req.query.shift) : undefined;
        const from = new Date(`${dateStr}T00:00:00.000Z`);
        const to = new Date(`${dateStr}T23:59:59.999Z`);
        const where = { tenant_id, planned_date: { gte: from, lte: to } };
        if (shift)
            where.shift = shift;
        const jobs = await prisma_1.default.jobCard.findMany({
            where,
            include: {
                job_operations: true,
                shot_logs: true,
                downtime_logs: true,
                rejection_logs: true
            }
        });
        const totalPlanned = jobs.reduce((s, j) => s + j.planned_quantity, 0);
        const totalGood = jobs.reduce((s, j) => s + j.actual_quantity_good, 0);
        const totalShots = jobs.reduce((s, j) => s + j.shot_logs.length, 0);
        const totalRejections = jobs.reduce((s, j) => s + j.rejection_logs.length, 0);
        const totalDowntime = jobs.reduce((s, j) => s + j.downtime_logs.reduce((ds, d) => ds + (d.duration_min || 0), 0), 0);
        const shiftMin = 480;
        const availability = Math.round(((shiftMin - totalDowntime) / shiftMin) * 100);
        const quality = totalShots > 0 ? Math.round((totalGood / totalShots) * 100) : 0;
        const allDowntimes = jobs.flatMap((j) => j.downtime_logs.map((d) => ({
            job_number: j.job_number,
            reason_code: d.reason_code || d.downtime_category,
            duration_min: d.duration_min,
            category: d.downtime_category
        })));
        const allRejections = jobs.flatMap((j) => j.rejection_logs.map((r) => ({
            job_number: j.job_number,
            defect_code: r.defect_code,
            quantity: r.quantity_rejected,
            disposition: r.disposition
        })));
        res.json({
            success: true,
            data: {
                date: from,
                shift: shift || 'all',
                summary: {
                    total_jobs: jobs.length,
                    planned_qty: totalPlanned,
                    good_parts: totalGood,
                    achievement_percent: totalPlanned > 0 ? Math.round((totalGood / totalPlanned) * 100) : 0,
                    total_shots: totalShots,
                    total_rejections: totalRejections,
                    rejection_rate: totalShots > 0 ? Math.round((totalRejections / totalShots) * 100 * 10) / 10 : 0,
                    downtime_minutes: totalDowntime,
                    availability_percent: availability,
                    quality_percent: quality
                },
                jobs: await Promise.all(jobs.map(async (j) => {
                    const item = j.item_id ? await prisma_1.default.itemMaster.findUnique({ where: { id: j.item_id }, select: { item_name: true, item_code: true } }) : null;
                    return {
                        job_number: j.job_number,
                        item_name: item?.item_name || '',
                        planned_qty: j.planned_quantity,
                        good_parts: j.actual_quantity_good,
                        shots: j.shot_logs.length,
                        rejections: j.rejection_logs.length,
                        downtime_min: j.downtime_logs.reduce((s, d) => s + (d.duration_min || 0), 0),
                        status: j.status
                    };
                })),
                downtime_log: allDowntimes,
                rejection_log: allRejections
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getShiftReport = getShiftReport;
// ─── MONTHLY PRODUCTION SUMMARY ───────────────────────────────────────────────
const getMonthlyProductionSummary = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const month = req.query.month ? parseInt(String(req.query.month)) : new Date().getMonth() + 1;
        const year = req.query.year ? parseInt(String(req.query.year)) : new Date().getFullYear();
        const { from, to } = await getMonthRange(month, year);
        const jobs = await prisma_1.default.jobCard.findMany({
            where: { tenant_id, planned_date: { gte: from, lte: to } },
            include: {
                shot_logs: true,
                downtime_logs: true,
                rejection_logs: true
            }
        });
        const totalPlanned = jobs.reduce((s, j) => s + j.planned_quantity, 0);
        const totalGood = jobs.reduce((s, j) => s + j.actual_quantity_good, 0);
        const totalShots = jobs.reduce((s, j) => s + j.shot_logs.length, 0);
        const totalRejections = jobs.reduce((s, j) => s + j.rejection_logs.length, 0);
        const totalDowntime = jobs.reduce((s, j) => s + j.downtime_logs.reduce((ds, d) => ds + (d.duration_min || 0), 0), 0);
        const itemCache = {};
        const byProduct = {};
        for (const j of jobs) {
            const key = j.item_id || 'unknown';
            if (!byProduct[key]) {
                if (j.item_id && !itemCache[j.item_id]) {
                    itemCache[j.item_id] = await prisma_1.default.itemMaster.findUnique({ where: { id: j.item_id }, select: { item_name: true, item_code: true } });
                }
                const item = j.item_id ? itemCache[j.item_id] : null;
                byProduct[key] = {
                    item_name: item?.item_name || 'Unknown',
                    item_code: item?.item_code || '',
                    planned: 0, good: 0, rejections: 0, jobs: 0
                };
            }
            byProduct[key].planned += j.planned_quantity;
            byProduct[key].good += j.actual_quantity_good;
            byProduct[key].rejections += j.rejection_logs.length;
            byProduct[key].jobs += 1;
        }
        const downtimeByReason = {};
        jobs.forEach((j) => {
            j.downtime_logs.forEach((d) => {
                const key = d.reason_code || d.downtime_category || 'unknown';
                downtimeByReason[key] = (downtimeByReason[key] || 0) + (d.duration_min || 0);
            });
        });
        const top5Downtime = Object.entries(downtimeByReason)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([reason, minutes]) => ({ reason, minutes }));
        res.json({
            success: true,
            data: {
                period: { month, year },
                summary: {
                    total_jobs: jobs.length,
                    planned_qty: totalPlanned,
                    good_parts: totalGood,
                    achievement_percent: totalPlanned > 0 ? Math.round((totalGood / totalPlanned) * 100) : 0,
                    total_shots: totalShots,
                    total_rejections: totalRejections,
                    rejection_rate: totalShots > 0 ? Math.round((totalRejections / totalShots) * 100 * 10) / 10 : 0,
                    total_downtime_hours: Math.round(totalDowntime / 60 * 10) / 10
                },
                by_product: Object.values(byProduct),
                top_5_downtime_reasons: top5Downtime
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getMonthlyProductionSummary = getMonthlyProductionSummary;
// ─── CUSTOMER OTIF ────────────────────────────────────────────────────────────
const getCustomerOTIF = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const month = req.query.month ? parseInt(String(req.query.month)) : new Date().getMonth() + 1;
        const year = req.query.year ? parseInt(String(req.query.year)) : new Date().getFullYear();
        const { from, to } = await getMonthRange(month, year);
        const dispatches = await prisma_1.default.dispatchHeader.findMany({
            where: { tenant_id, dispatch_date: { gte: from, lte: to } },
            include: { dispatch_lines: { include: { item: true } } }
        });
        const salesOrders = await prisma_1.default.salesOrder.findMany({
            where: { tenant_id, delivery_date: { gte: from, lte: to } },
            include: { so_lines: true }
        });
        const customerStats = {};
        salesOrders.forEach((so) => {
            const custId = so.customer_id || so.customer_name;
            if (!customerStats[custId]) {
                customerStats[custId] = {
                    customer_name: so.customer_name,
                    total_orders: 0,
                    on_time: 0,
                    in_full: 0,
                    otif: 0,
                    orders: []
                };
            }
            const totalOrdered = so.so_lines.reduce((s, l) => s + l.quantity_ordered, 0);
            const totalDispatched = so.so_lines.reduce((s, l) => s + (l.quantity_dispatched || 0), 0);
            const deliveryDate = so.delivery_date ? new Date(so.delivery_date) : null;
            const lastDispatch = dispatches.find((d) => d.so_id === so.id);
            const dispatchDate = lastDispatch ? new Date(lastDispatch.dispatch_date) : null;
            const isOnTime = deliveryDate && dispatchDate ? dispatchDate <= deliveryDate : false;
            const isInFull = totalDispatched >= totalOrdered;
            customerStats[custId].total_orders++;
            if (isOnTime)
                customerStats[custId].on_time++;
            if (isInFull)
                customerStats[custId].in_full++;
            customerStats[custId].orders.push({
                so_number: so.so_number,
                delivery_date: deliveryDate,
                dispatch_date: dispatchDate,
                ordered: totalOrdered,
                dispatched: totalDispatched,
                on_time: isOnTime,
                in_full: isInFull,
                otif: isOnTime && isInFull
            });
        });
        Object.values(customerStats).forEach((c) => {
            const otifCount = c.orders.filter((o) => o.otif).length;
            c.otif_count = otifCount;
            c.otif_percent = c.total_orders > 0 ? Math.round((otifCount / c.total_orders) * 100) : 0;
            c.on_time_percent = c.total_orders > 0 ? Math.round((c.on_time / c.total_orders) * 100) : 0;
            c.in_full_percent = c.total_orders > 0 ? Math.round((c.in_full / c.total_orders) * 100) : 0;
        });
        const allOrders = Object.values(customerStats).reduce((s, c) => s + c.total_orders, 0);
        const allOTIF = Object.values(customerStats).reduce((s, c) => s + c.otif_count, 0);
        res.json({
            success: true,
            data: {
                period: { month, year },
                overall_otif_percent: allOrders > 0 ? Math.round((allOTIF / allOrders) * 100) : 0,
                total_orders: allOrders,
                customers: Object.values(customerStats)
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getCustomerOTIF = getCustomerOTIF;
// ─── REJECTION TREND ──────────────────────────────────────────────────────────
const getRejectionTrend = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const month = req.query.month ? parseInt(String(req.query.month)) : new Date().getMonth() + 1;
        const year = req.query.year ? parseInt(String(req.query.year)) : new Date().getFullYear();
        const { from, to } = await getMonthRange(month, year);
        const rejections = await prisma_1.default.rejectionLog.findMany({
            where: { tenant_id, logged_at: { gte: from, lte: to } }
        });
        const byDefect = {};
        rejections.forEach((r) => {
            const key = r.defect_code || 'unknown';
            if (!byDefect[key])
                byDefect[key] = { defect_code: key, count: 0, quantity: 0 };
            byDefect[key].count++;
            byDefect[key].quantity += r.quantity_rejected || 1;
        });
        const pareto = Object.values(byDefect)
            .sort((a, b) => b.quantity - a.quantity);
        const total = pareto.reduce((s, d) => s + d.quantity, 0);
        let cumulative = 0;
        pareto.forEach((d) => {
            d.percent = total > 0 ? Math.round((d.quantity / total) * 100) : 0;
            cumulative += d.percent;
            d.cumulative_percent = cumulative;
        });
        const byDisposition = rejections.reduce((acc, r) => {
            const key = r.disposition || 'unknown';
            acc[key] = (acc[key] || 0) + (r.quantity_rejected || 1);
            return acc;
        }, {});
        res.json({
            success: true,
            data: {
                period: { month, year },
                total_rejections: rejections.length,
                total_qty_rejected: total,
                pareto: pareto,
                by_disposition: byDisposition
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getRejectionTrend = getRejectionTrend;
// ─── DIE HEALTH REPORT ────────────────────────────────────────────────────────
const getDieHealthReport = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const dies = await prisma_1.default.dieMaster.findMany({
            where: { tenant_id, is_active: true },
            orderBy: { current_shot_count: 'desc' }
        });
        const dieHealth = dies.map((die) => {
            const shotsSincePM = die.current_shot_count - die.shots_at_last_pm;
            const pmInterval = die.pm_interval_shots ?? 20000;
            const shotsToNextPM = pmInterval - shotsSincePM;
            const pmPercent = Math.round((shotsSincePM / pmInterval) * 100);
            const designLifeRemaining = die.design_life_shots
                ? Math.round(((die.design_life_shots - die.current_shot_count) / die.design_life_shots) * 100)
                : null;
            return {
                die_number: die.die_number,
                die_name: die.die_name,
                current_shot_count: die.current_shot_count,
                shots_at_last_pm: die.shots_at_last_pm,
                shots_since_last_pm: shotsSincePM,
                pm_interval: pmInterval,
                shots_to_next_pm: shotsToNextPM,
                pm_percent: pmPercent,
                pm_status: pmPercent >= 100 ? 'overdue' : pmPercent >= 90 ? 'critical' : pmPercent >= 75 ? 'warning' : 'healthy',
                design_life_shots: die.design_life_shots,
                design_life_remaining_percent: designLifeRemaining,
                current_status: die.current_status
            };
        });
        const summary = {
            total_dies: dies.length,
            overdue: dieHealth.filter((d) => d.pm_status === 'overdue').length,
            critical: dieHealth.filter((d) => d.pm_status === 'critical').length,
            warning: dieHealth.filter((d) => d.pm_status === 'warning').length,
            healthy: dieHealth.filter((d) => d.pm_status === 'healthy').length
        };
        res.json({ success: true, data: { summary, dies: dieHealth } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getDieHealthReport = getDieHealthReport;
// ─── SUPPLIER PERFORMANCE ─────────────────────────────────────────────────────
const getSupplierPerformance = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const month = req.query.month ? parseInt(String(req.query.month)) : new Date().getMonth() + 1;
        const year = req.query.year ? parseInt(String(req.query.year)) : new Date().getFullYear();
        const { from, to } = await getMonthRange(month, year);
        const pos = await prisma_1.default.purchaseOrder.findMany({
            where: { tenant_id, po_date: { gte: from, lte: to } },
            include: { supplier: true }
        });
        const grns = await prisma_1.default.grnHeader.findMany({
            where: { tenant_id, received_date: { gte: from, lte: to } },
            include: { grn_lines: true }
        });
        const supplierStats = {};
        pos.forEach((po) => {
            const suppId = po.supplier_id;
            if (!suppId)
                return;
            if (!supplierStats[suppId]) {
                supplierStats[suppId] = {
                    supplier_name: po.supplier?.supplier_name || 'Unknown',
                    total_pos: 0,
                    grns_received: 0,
                    on_time_deliveries: 0,
                    total_qty_ordered: 0,
                    total_qty_received: 0,
                    total_qty_rejected: 0
                };
            }
            supplierStats[suppId].total_pos++;
        });
        grns.forEach((grn) => {
            const po = pos.find((p) => p.id === grn.po_id);
            if (!po?.supplier_id)
                return;
            const suppId = po.supplier_id;
            if (!supplierStats[suppId])
                return;
            supplierStats[suppId].grns_received++;
            const totalReceived = grn.grn_lines.reduce((s, l) => s + l.quantity_received, 0);
            const totalRejected = grn.grn_lines.reduce((s, l) => s + (l.quantity_rejected || 0), 0);
            supplierStats[suppId].total_qty_received += totalReceived;
            supplierStats[suppId].total_qty_rejected += totalRejected;
            if (po.expected_delivery_date) {
                const isOnTime = new Date(grn.received_date) <= new Date(po.expected_delivery_date);
                if (isOnTime)
                    supplierStats[suppId].on_time_deliveries++;
            }
        });
        Object.values(supplierStats).forEach((s) => {
            s.on_time_percent = s.grns_received > 0
                ? Math.round((s.on_time_deliveries / s.grns_received) * 100) : 0;
            s.rejection_rate = s.total_qty_received > 0
                ? Math.round((s.total_qty_rejected / s.total_qty_received) * 100 * 10) / 10 : 0;
            s.delivery_rate = s.total_pos > 0
                ? Math.round((s.grns_received / s.total_pos) * 100) : 0;
        });
        res.json({
            success: true,
            data: {
                period: { month, year },
                suppliers: Object.values(supplierStats)
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getSupplierPerformance = getSupplierPerformance;
