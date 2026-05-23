import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── COMPANY CONFIG ──────────────────────────────────────────────────────────

export const getCompanyConfig = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const config = await prisma.companyConfig.findUnique({ where: { tenant_id } });
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const setCompanyConfig = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const config = await prisma.companyConfig.upsert({
      where: { tenant_id },
      update: req.body,
      create: { tenant_id, ...req.body }
    });
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── BANK ACCOUNTS ───────────────────────────────────────────────────────────

export const getBankAccounts = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const accounts = await prisma.bankAccount.findMany({ where: { tenant_id, is_active: true } });
    res.json({ success: true, data: accounts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createBankAccount = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const account = await prisma.bankAccount.create({ data: { tenant_id, ...req.body } });
    res.status(201).json({ success: true, data: account });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── INVOICES ────────────────────────────────────────────────────────────────

export const getInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { status, customer_id } = req.query;
    const where: any = { tenant_id };
    if (status) where.status = String(status);
    if (customer_id) where.customer_id = String(customer_id);
    const invoices = await prisma.invoiceHeader.findMany({
      where,
      include: { lines: true, payments: true },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getInvoiceById = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id;
    const invoice = await prisma.invoiceHeader.findFirst({
      where: { id, tenant_id },
      include: { lines: true, payments: true, credit_notes: true }
    });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { lines, ...header } = req.body;

    const config = await prisma.companyConfig.findUnique({ where: { tenant_id } });
    const prefix = config?.invoice_prefix || 'INV';
    const count = await prisma.invoiceHeader.count({ where: { tenant_id } });
    const invoice_number = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let total_cgst = 0;
    let total_sgst = 0;
    let total_igst = 0;

    const processedLines = lines.map((line: any) => {
      const amount = line.quantity * line.unit_price;
      const isInterState = header.is_inter_state || false;
      const taxRate = line.tax_rate || 18;
      const cgst = isInterState ? 0 : amount * (taxRate / 2) / 100;
      const sgst = isInterState ? 0 : amount * (taxRate / 2) / 100;
      const igst = isInterState ? amount * taxRate / 100 : 0;
      subtotal += amount;
      total_cgst += cgst;
      total_sgst += sgst;
      total_igst += igst;
      return {
        item_id: line.item_id,
        item_name: line.item_name,
        hsn_code: line.hsn_code,
        quantity: line.quantity,
        unit_price: line.unit_price,
        amount,
        tax_rate: taxRate,
        cgst_rate: isInterState ? 0 : taxRate / 2,
        sgst_rate: isInterState ? 0 : taxRate / 2,
        igst_rate: isInterState ? taxRate : 0,
        cgst_amount: Math.round(cgst * 100) / 100,
        sgst_amount: Math.round(sgst * 100) / 100,
        igst_amount: Math.round(igst * 100) / 100,
        total_amount: Math.round((amount + cgst + sgst + igst) * 100) / 100
      };
    });

    const total_amount = subtotal + total_cgst + total_sgst + total_igst;

    const invoice = await prisma.invoiceHeader.create({
      data: {
        tenant_id,
        invoice_number,
        ...header,
        subtotal: Math.round(subtotal * 100) / 100,
        cgst_amount: Math.round(total_cgst * 100) / 100,
        sgst_amount: Math.round(total_sgst * 100) / 100,
        igst_amount: Math.round(total_igst * 100) / 100,
        total_amount: Math.round(total_amount * 100) / 100,
        status: 'draft',
        lines: { create: processedLines }
      },
      include: { lines: true }
    });

    await postJournalEntry(tenant_id, {
      entry_date: new Date(header.invoice_date),
      entry_type: 'auto',
      reference_type: 'invoice',
      reference_id: invoice.id,
      description: `Invoice ${invoice_number} — ${header.customer_name}`,
      lines: [
        { account_code: '1100', debit: total_amount, credit: 0, description: `AR — ${header.customer_name}` },
        { account_code: '3000', debit: 0, credit: subtotal, description: `Sales — ${header.customer_name}` },
        ...(total_cgst > 0 ? [{ account_code: '2101', debit: 0, credit: total_cgst, description: 'CGST Payable' }] : []),
        ...(total_sgst > 0 ? [{ account_code: '2102', debit: 0, credit: total_sgst, description: 'SGST Payable' }] : []),
        ...(total_igst > 0 ? [{ account_code: '2103', debit: 0, credit: total_igst, description: 'IGST Payable' }] : [])
      ]
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createInvoiceFromDispatch = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const dispatch_id = req.params.dispatch_id;

    const dispatch = await prisma.dispatchHeader.findFirst({
      where: { id: dispatch_id, tenant_id },
      include: { dispatch_lines: { include: { item: true } } }
    });
    if (!dispatch) return res.status(404).json({ success: false, error: 'Dispatch not found' });

    const salesOrder = dispatch.so_id
      ? await prisma.salesOrder.findFirst({ where: { id: dispatch.so_id } })
      : null;
    const customer = (salesOrder as any)?.customer_id
      ? await prisma.customerMaster.findUnique({ where: { id: (salesOrder as any).customer_id } })
      : null;

    const config = await prisma.companyConfig.findUnique({ where: { tenant_id } });
    const factoryStateCode = config?.state_code || '33';
    const customerStateCode = (customer as any)?.state_code || '33';
    const isInterState = factoryStateCode !== customerStateCode;

    const lines = (dispatch as any).dispatch_lines.map((dl: any) => ({
      item_id: dl.item_id,
      item_name: dl.item?.item_name || '',
      hsn_code: dl.item?.hsn_code || '',
      quantity: dl.quantity_dispatched,
      unit_price: dl.item?.selling_price || 0,
      tax_rate: dl.item?.tax_rate || 18
    }));

    req.body = {
      invoice_date: new Date().toISOString(),
      due_date: null,
      customer_id: salesOrder?.customer_id || '',
      customer_name: (salesOrder as any)?.customer_name || customer?.customer_name || '',
      customer_gstin: (customer as any)?.gstin || '',
      dispatch_id,
      is_inter_state: isInterState,
      payment_terms: (customer as any)?.payment_terms || 'Net 30',
      lines
    };

    return createInvoice(req, res);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateInvoiceStatus = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id;
    const { status } = req.body;
    await prisma.invoiceHeader.updateMany({ where: { id, tenant_id }, data: { status } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── PAYMENT RECEIPTS ─────────────────────────────────────────────────────────

export const getPaymentReceipts = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const receipts = await prisma.paymentReceipt.findMany({
      where: { tenant_id },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: receipts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createPaymentReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { invoice_id, amount_received, payment_date, payment_mode, reference_number, bank_account_id, notes } = req.body;

    const invoice = await prisma.invoiceHeader.findFirst({ where: { id: invoice_id, tenant_id } });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const count = await prisma.paymentReceipt.count({ where: { tenant_id } });
    const receipt_number = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const receipt = await prisma.paymentReceipt.create({
      data: {
        tenant_id,
        receipt_number,
        receipt_date: new Date(payment_date),
        invoice_id,
        customer_id: invoice.customer_id,
        amount_received,
        payment_mode,
        reference_number,
        bank_account_id,
        notes,
        status: 'received'
      }
    });

    const newAmountPaid = invoice.amount_paid + amount_received;
    const newStatus = newAmountPaid >= invoice.total_amount ? 'paid' :
      newAmountPaid > 0 ? 'partial' : 'sent';

    await prisma.invoiceHeader.updateMany({
      where: { id: invoice_id },
      data: { amount_paid: newAmountPaid, status: newStatus }
    });

    if (bank_account_id) {
      await prisma.bankAccount.updateMany({
        where: { id: bank_account_id },
        data: { current_balance: { increment: amount_received } }
      });
    }

    await postJournalEntry(tenant_id, {
      entry_date: new Date(payment_date),
      entry_type: 'auto',
      reference_type: 'payment_receipt',
      reference_id: receipt.id,
      description: `Payment received — ${receipt_number}`,
      lines: [
        { account_code: '1001', debit: amount_received, credit: 0, description: `Bank receipt — ${receipt_number}` },
        { account_code: '1100', debit: 0, credit: amount_received, description: `AR cleared — ${receipt_number}` }
      ]
    });

    res.status(201).json({ success: true, data: receipt });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const reversePaymentReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id;
    const { reason } = req.body;

    const receipt = await prisma.paymentReceipt.findFirst({ where: { id, tenant_id } });
    if (!receipt) return res.status(404).json({ success: false, error: 'Receipt not found' });
    if (receipt.status === 'reversed') return res.status(400).json({ success: false, error: 'Already reversed' });

    await prisma.paymentReceipt.updateMany({
      where: { id },
      data: { status: 'reversed', reversal_reason: reason, reversed_at: new Date() }
    });

    await prisma.invoiceHeader.updateMany({
      where: { id: receipt.invoice_id },
      data: {
        amount_paid: { decrement: receipt.amount_received },
        status: 'sent'
      }
    });

    if (receipt.bank_account_id) {
      await prisma.bankAccount.updateMany({
        where: { id: receipt.bank_account_id },
        data: { current_balance: { decrement: receipt.amount_received } }
      });
    }

    await postJournalEntry(tenant_id, {
      entry_date: new Date(),
      entry_type: 'auto',
      reference_type: 'payment_reversal',
      reference_id: id,
      description: `Payment reversed — ${reason}`,
      is_reversal: true,
      lines: [
        { account_code: '1100', debit: receipt.amount_received, credit: 0, description: `AR restored — reversal` },
        { account_code: '1001', debit: 0, credit: receipt.amount_received, description: `Bank reversal` }
      ]
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── CREDIT NOTES ─────────────────────────────────────────────────────────────

export const createCreditNote = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { invoice_id, reason, return_type, lines } = req.body;

    const invoice = await prisma.invoiceHeader.findFirst({ where: { id: invoice_id, tenant_id } });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const daysSinceInvoice = (new Date().getTime() - new Date(invoice.invoice_date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceInvoice > 30) {
      await prisma.systemAlert.create({
        data: {
          tenant_id,
          alert_type: 'credit_note_late',
          severity: 'warning',
          message: `Credit note raised ${Math.round(daysSinceInvoice)} days after invoice. GST rules require credit notes within 30 days.`,
          reference_type: 'invoice',
          reference_id: invoice_id
        }
      });
    }

    const config = await prisma.companyConfig.findUnique({ where: { tenant_id } });
    const prefix = config?.cn_prefix || 'CN';
    const count = await prisma.creditNote.count({ where: { tenant_id } });
    const cn_number = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let total_cgst = 0;
    let total_sgst = 0;
    let total_igst = 0;

    lines.forEach((line: any) => {
      subtotal += line.amount;
      total_cgst += line.cgst_amount || 0;
      total_sgst += line.sgst_amount || 0;
      total_igst += line.igst_amount || 0;
    });

    const total_amount = subtotal + total_cgst + total_sgst + total_igst;

    const cn = await prisma.creditNote.create({
      data: {
        tenant_id,
        cn_number,
        cn_date: new Date(),
        invoice_id,
        customer_id: invoice.customer_id,
        customer_name: invoice.customer_name,
        reason,
        return_type,
        subtotal: Math.round(subtotal * 100) / 100,
        cgst_amount: Math.round(total_cgst * 100) / 100,
        sgst_amount: Math.round(total_sgst * 100) / 100,
        igst_amount: Math.round(total_igst * 100) / 100,
        total_amount: Math.round(total_amount * 100) / 100,
        status: 'issued'
      }
    });

    await postJournalEntry(tenant_id, {
      entry_date: new Date(),
      entry_type: 'auto',
      reference_type: 'credit_note',
      reference_id: cn.id,
      description: `Credit note ${cn_number} — ${reason}`,
      is_reversal: true,
      lines: [
        { account_code: '3000', debit: subtotal, credit: 0, description: `Sales reversal — ${cn_number}` },
        ...(total_cgst > 0 ? [{ account_code: '2101', debit: total_cgst, credit: 0, description: 'CGST reversal' }] : []),
        ...(total_sgst > 0 ? [{ account_code: '2102', debit: total_sgst, credit: 0, description: 'SGST reversal' }] : []),
        ...(total_igst > 0 ? [{ account_code: '2103', debit: total_igst, credit: 0, description: 'IGST reversal' }] : []),
        { account_code: '1100', debit: 0, credit: total_amount, description: `AR reduction — ${cn_number}` }
      ]
    });

    res.status(201).json({ success: true, data: cn });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── SUPPLIER BILLS ───────────────────────────────────────────────────────────

export const getSupplierBills = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const bills = await prisma.supplierBill.findMany({
      where: { tenant_id },
      include: { lines: true, payments: true },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: bills });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createSupplierBillFromGRN = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const grn_id = req.params.grn_id;

    const grn = await prisma.grnHeader.findFirst({
      where: { id: grn_id, tenant_id: tenant_id },
      include: { grn_lines: { include: { item: true } } }
    });
    if (!grn) return res.status(404).json({ success: false, error: 'GRN not found' });

    const po = grn.po_id ? await prisma.purchaseOrder.findFirst({ where: { id: grn.po_id } }) : null;
    const supplier = po?.supplier_id ? await prisma.supplierMaster.findUnique({ where: { id: po.supplier_id } }) : null;

    const config = await prisma.companyConfig.findUnique({ where: { tenant_id } });
    const factoryStateCode = config?.state_code || '33';
    const supplierStateCode = (supplier as any)?.state_code || '33';
    const isInterState = factoryStateCode !== supplierStateCode;

    let subtotal = 0;
    let total_cgst = 0;
    let total_sgst = 0;
    let total_igst = 0;

    const billLines = (grn as any).grn_lines.map((gl: any) => {
      const amount = gl.quantity_received * (gl.unit_price || 0);
      const taxRate = gl.item?.tax_rate || 18;
      const cgst = isInterState ? 0 : amount * (taxRate / 2) / 100;
      const sgst = isInterState ? 0 : amount * (taxRate / 2) / 100;
      const igst = isInterState ? amount * taxRate / 100 : 0;
      subtotal += amount;
      total_cgst += cgst;
      total_sgst += sgst;
      total_igst += igst;
      return {
        item_id: gl.item_id,
        item_name: gl.item?.item_name || '',
        hsn_code: gl.item?.hsn_code || '',
        quantity: gl.quantity_received,
        unit_price: gl.unit_price || 0,
        amount,
        tax_rate: taxRate,
        cgst_amount: Math.round(cgst * 100) / 100,
        sgst_amount: Math.round(sgst * 100) / 100,
        igst_amount: Math.round(igst * 100) / 100,
        total_amount: Math.round((amount + cgst + sgst + igst) * 100) / 100
      };
    });

    const total_amount = subtotal + total_cgst + total_sgst + total_igst;
    const count = await prisma.supplierBill.count({ where: { tenant_id } });
    const bill_number = `BILL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const bill = await prisma.supplierBill.create({
      data: {
        tenant_id,
        bill_number,
        bill_date: new Date(),
        supplier_id: po?.supplier_id || '',
        supplier_name: supplier?.supplier_name || '',
        supplier_gstin: (supplier as any)?.gstin || '',
        grn_id,
        subtotal: Math.round(subtotal * 100) / 100,
        cgst_amount: Math.round(total_cgst * 100) / 100,
        sgst_amount: Math.round(total_sgst * 100) / 100,
        igst_amount: Math.round(total_igst * 100) / 100,
        total_amount: Math.round(total_amount * 100) / 100,
        status: 'pending',
        lines: { create: billLines }
      },
      include: { lines: true }
    });

    await postJournalEntry(tenant_id, {
      entry_date: new Date(),
      entry_type: 'auto',
      reference_type: 'supplier_bill',
      reference_id: bill.id,
      description: `Supplier bill ${bill_number} — ${supplier?.supplier_name}`,
      lines: [
        { account_code: '1201', debit: subtotal, credit: 0, description: `Raw material received` },
        ...(total_cgst > 0 ? [{ account_code: '1301', debit: total_cgst, credit: 0, description: 'GST Input — CGST' }] : []),
        ...(total_sgst > 0 ? [{ account_code: '1302', debit: total_sgst, credit: 0, description: 'GST Input — SGST' }] : []),
        ...(total_igst > 0 ? [{ account_code: '1303', debit: total_igst, credit: 0, description: 'GST Input — IGST' }] : []),
        { account_code: '2000', debit: 0, credit: total_amount, description: `AP — ${supplier?.supplier_name}` }
      ]
    });

    res.status(201).json({ success: true, data: bill });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createPaymentVoucher = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { bill_id, amount_paid, payment_date, payment_mode, reference_number, bank_account_id, notes } = req.body;

    const bill = await prisma.supplierBill.findFirst({ where: { id: bill_id, tenant_id } });
    if (!bill) return res.status(404).json({ success: false, error: 'Bill not found' });

    const count = await prisma.paymentVoucher.count({ where: { tenant_id } });
    const voucher_number = `PV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const voucher = await prisma.paymentVoucher.create({
      data: {
        tenant_id,
        voucher_number,
        voucher_date: new Date(payment_date),
        bill_id,
        supplier_id: bill.supplier_id,
        amount_paid,
        payment_mode,
        reference_number,
        bank_account_id,
        notes,
        status: 'paid'
      }
    });

    const newAmountPaid = bill.amount_paid + amount_paid;
    const newStatus = newAmountPaid >= bill.total_amount ? 'paid' : 'partial';

    await prisma.supplierBill.updateMany({
      where: { id: bill_id },
      data: { amount_paid: newAmountPaid, status: newStatus }
    });

    if (bank_account_id) {
      await prisma.bankAccount.updateMany({
        where: { id: bank_account_id },
        data: { current_balance: { decrement: amount_paid } }
      });
    }

    await postJournalEntry(tenant_id, {
      entry_date: new Date(payment_date),
      entry_type: 'auto',
      reference_type: 'payment_voucher',
      reference_id: voucher.id,
      description: `Payment to supplier — ${voucher_number}`,
      lines: [
        { account_code: '2000', debit: amount_paid, credit: 0, description: `AP cleared — ${voucher_number}` },
        { account_code: '1001', debit: 0, credit: amount_paid, description: `Bank payment — ${voucher_number}` }
      ]
    });

    res.status(201).json({ success: true, data: voucher });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createDebitNote = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { bill_id, reason, quantity_returned, amount } = req.body;

    const bill = await prisma.supplierBill.findFirst({ where: { id: bill_id, tenant_id } });
    if (!bill) return res.status(404).json({ success: false, error: 'Bill not found' });

    const config = await prisma.companyConfig.findUnique({ where: { tenant_id } });
    const prefix = config?.dn_prefix || 'DN';
    const count = await prisma.debitNote.count({ where: { tenant_id } });
    const dn_number = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const dn = await prisma.debitNote.create({
      data: {
        tenant_id,
        dn_number,
        dn_date: new Date(),
        bill_id,
        supplier_id: bill.supplier_id,
        supplier_name: bill.supplier_name,
        reason,
        quantity_returned,
        subtotal: amount,
        total_amount: amount,
        status: 'issued'
      }
    });

    await postJournalEntry(tenant_id, {
      entry_date: new Date(),
      entry_type: 'auto',
      reference_type: 'debit_note',
      reference_id: dn.id,
      description: `Debit note ${dn_number} — ${reason}`,
      is_reversal: true,
      lines: [
        { account_code: '2000', debit: amount, credit: 0, description: `AP reduction — ${dn_number}` },
        { account_code: '1201', debit: 0, credit: amount, description: `Stock return — ${dn_number}` }
      ]
    });

    res.status(201).json({ success: true, data: dn });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const expenses = await prisma.expenseEntry.findMany({
      where: { tenant_id, is_reversed: false as boolean },
      orderBy: { expense_date: 'desc' }
    });
    res.json({ success: true, data: expenses });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const count = await prisma.expenseEntry.count({ where: { tenant_id } });
    const expense_number = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const expenseAccountMap: any = {
      salary: '5001', rent: '5002', utilities: '5003',
      maintenance: '5004', other: '5005'
    };

    const expense = await prisma.expenseEntry.create({
      data: { tenant_id, expense_number, ...req.body, expense_date: new Date(req.body.expense_date) }
    });

    const accountCode = expenseAccountMap[req.body.category] || '5005';

    await postJournalEntry(tenant_id, {
      entry_date: new Date(req.body.expense_date),
      entry_type: 'auto',
      reference_type: 'expense',
      reference_id: expense.id,
      description: `Expense — ${req.body.description}`,
      lines: [
        { account_code: accountCode, debit: req.body.amount, credit: 0, description: req.body.description },
        { account_code: '1001', debit: 0, credit: req.body.amount, description: `Payment — ${req.body.payment_mode}` }
      ]
    });

    if (req.body.bank_account_id) {
      await prisma.bankAccount.updateMany({
        where: { id: req.body.bank_account_id },
        data: { current_balance: { decrement: req.body.amount } }
      });
    }

    res.status(201).json({ success: true, data: expense });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const reverseExpense = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const id = req.params.id;
    const { reason } = req.body;

    const expense = await prisma.expenseEntry.findFirst({ where: { id, tenant_id } });
    if (!expense) return res.status(404).json({ success: false, error: 'Expense not found' });

    await prisma.expenseEntry.updateMany({
      where: { id },
      data: { is_reversed: true, reversal_reason: reason, reversed_at: new Date() }
    });

    if (expense.bank_account_id) {
      await prisma.bankAccount.updateMany({
        where: { id: expense.bank_account_id },
        data: { current_balance: { increment: expense.amount } }
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── REPORTS ──────────────────────────────────────────────────────────────────

export const getProfitAndLoss = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { from_date, to_date } = req.query;
    const from = from_date ? new Date(from_date as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = to_date ? new Date(to_date as string) : new Date();

    const invoices = await prisma.invoiceHeader.findMany({
      where: { tenant_id, invoice_date: { gte: from, lte: to }, status: { not: 'reversed' as string } }
    });
    const totalRevenue = invoices.reduce((s: number, i: any) => s + i.subtotal, 0);

    const stockLedger = await prisma.stockLedger.findMany({
      where: { tenant_id, transaction_type: 'issue', transacted_at: { gte: from, lte: to } }
    });

    let materialCost = 0;
    for (const entry of stockLedger) {
      const avgCost = await prisma.stockLedger.aggregate({
        where: { tenant_id, item_id: entry.item_id, transaction_type: 'receipt' },
        _avg: { unit_cost: true }
      });
      materialCost += Math.abs(entry.quantity) * (avgCost._avg.unit_cost ?? 0);
    }

    const expenses = await prisma.expenseEntry.findMany({
      where: { tenant_id, expense_date: { gte: from, lte: to }, is_reversed: false }
    });

    const expenseByCategory = expenses.reduce((acc: any, exp: any) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    const totalExpenses = expenses.reduce((s: number, e: any) => s + e.amount, 0);
    const grossProfit = totalRevenue - materialCost;
    const netProfit = grossProfit - totalExpenses;

    res.json({
      success: true,
      data: {
        period: { from, to },
        revenue: {
          total: Math.round(totalRevenue),
          invoice_count: invoices.length
        },
        cost_of_goods: {
          material_cost: Math.round(materialCost)
        },
        gross_profit: Math.round(grossProfit),
        gross_margin_percent: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0,
        operating_expenses: {
          total: Math.round(totalExpenses),
          by_category: expenseByCategory
        },
        net_profit: Math.round(netProfit),
        net_margin_percent: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getCustomerAging = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const today = new Date();

    const invoices = await prisma.invoiceHeader.findMany({
      where: { tenant_id, status: { in: ['sent', 'partial', 'overdue'] as string[] } }
    });

    const aging: any = {};

    for (const inv of invoices) {
      const outstanding = inv.total_amount - inv.amount_paid;
      if (outstanding <= 0) continue;

      const daysOutstanding = Math.floor((today.getTime() - new Date(inv.invoice_date).getTime()) / (1000 * 60 * 60 * 24));
      const bucket = daysOutstanding <= 30 ? '0_30' : daysOutstanding <= 60 ? '31_60' : daysOutstanding <= 90 ? '61_90' : '90_plus';

      if (!aging[inv.customer_id]) {
        aging[inv.customer_id] = {
          customer_name: inv.customer_name,
          total_outstanding: 0,
          buckets: { '0_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 }
        };
      }

      aging[inv.customer_id].total_outstanding += outstanding;
      aging[inv.customer_id].buckets[bucket] += outstanding;

      if (daysOutstanding > 30) {
        await prisma.invoiceHeader.updateMany({ where: { id: inv.id }, data: { status: 'overdue' } });
      }
    }

    const summary = {
      total_outstanding: Object.values(aging).reduce((s: number, a: any) => s + a.total_outstanding, 0),
      bucket_0_30: Object.values(aging).reduce((s: number, a: any) => s + a.buckets['0_30'], 0),
      bucket_31_60: Object.values(aging).reduce((s: number, a: any) => s + a.buckets['31_60'], 0),
      bucket_61_90: Object.values(aging).reduce((s: number, a: any) => s + a.buckets['61_90'], 0),
      bucket_90_plus: Object.values(aging).reduce((s: number, a: any) => s + a.buckets['90_plus'], 0)
    };

    res.json({ success: true, data: { summary, customers: Object.values(aging) } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSupplierAging = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const today = new Date();

    const bills = await prisma.supplierBill.findMany({
      where: { tenant_id, status: { in: ['pending', 'partial'] as string[] } }
    });

    const aging: any = {};

    for (const bill of bills) {
      const outstanding = bill.total_amount - bill.amount_paid;
      if (outstanding <= 0) continue;

      const daysOutstanding = Math.floor((today.getTime() - new Date(bill.bill_date).getTime()) / (1000 * 60 * 60 * 24));
      const bucket = daysOutstanding <= 30 ? '0_30' : daysOutstanding <= 60 ? '31_60' : daysOutstanding <= 90 ? '61_90' : '90_plus';

      if (!aging[bill.supplier_id]) {
        aging[bill.supplier_id] = {
          supplier_name: bill.supplier_name,
          total_outstanding: 0,
          buckets: { '0_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 }
        };
      }

      aging[bill.supplier_id].total_outstanding += outstanding;
      aging[bill.supplier_id].buckets[bucket] += outstanding;
    }

    const summary = {
      total_payable: Object.values(aging).reduce((s: number, a: any) => s + a.total_outstanding, 0),
      bucket_0_30: Object.values(aging).reduce((s: number, a: any) => s + a.buckets['0_30'], 0),
      bucket_31_60: Object.values(aging).reduce((s: number, a: any) => s + a.buckets['31_60'], 0),
      bucket_61_90: Object.values(aging).reduce((s: number, a: any) => s + a.buckets['61_90'], 0),
      bucket_90_plus: Object.values(aging).reduce((s: number, a: any) => s + a.buckets['90_plus'], 0)
    };

    res.json({ success: true, data: { summary, suppliers: Object.values(aging) } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getGSTSummary = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const { month, year } = req.query;
    const m = month ? parseInt(month as string) - 1 : new Date().getMonth();
    const y = year ? parseInt(year as string) : new Date().getFullYear();
    const from = new Date(y, m, 1);
    const to = new Date(y, m + 1, 0, 23, 59, 59);

    const invoices = await prisma.invoiceHeader.findMany({
      where: { tenant_id, invoice_date: { gte: from, lte: to }, status: { not: 'reversed' as string } },
      include: { lines: true }
    });

    const bills = await prisma.supplierBill.findMany({
      where: { tenant_id, bill_date: { gte: from, lte: to } },
      include: { lines: true }
    });

    const creditNotes = await prisma.creditNote.findMany({
      where: { tenant_id, cn_date: { gte: from, lte: to } }
    });

    const output_cgst = invoices.reduce((s: number, i: any) => s + i.cgst_amount, 0);
    const output_sgst = invoices.reduce((s: number, i: any) => s + i.sgst_amount, 0);
    const output_igst = invoices.reduce((s: number, i: any) => s + i.igst_amount, 0);

    const cn_cgst = creditNotes.reduce((s: number, cn: any) => s + cn.cgst_amount, 0);
    const cn_sgst = creditNotes.reduce((s: number, cn: any) => s + cn.sgst_amount, 0);
    const cn_igst = creditNotes.reduce((s: number, cn: any) => s + cn.igst_amount, 0);

    const input_cgst = bills.reduce((s: number, b: any) => s + b.cgst_amount, 0);
    const input_sgst = bills.reduce((s: number, b: any) => s + b.sgst_amount, 0);
    const input_igst = bills.reduce((s: number, b: any) => s + b.igst_amount, 0);

    const net_cgst = (output_cgst - cn_cgst) - input_cgst;
    const net_sgst = (output_sgst - cn_sgst) - input_sgst;
    const net_igst = (output_igst - cn_igst) - input_igst;
    const total_gst_payable = net_cgst + net_sgst + net_igst;

    res.json({
      success: true,
      data: {
        period: { month: m + 1, year: y },
        output_tax: {
          cgst: Math.round(output_cgst * 100) / 100,
          sgst: Math.round(output_sgst * 100) / 100,
          igst: Math.round(output_igst * 100) / 100,
          total: Math.round((output_cgst + output_sgst + output_igst) * 100) / 100
        },
        credit_notes: {
          cgst: Math.round(cn_cgst * 100) / 100,
          sgst: Math.round(cn_sgst * 100) / 100,
          igst: Math.round(cn_igst * 100) / 100
        },
        input_tax_credit: {
          cgst: Math.round(input_cgst * 100) / 100,
          sgst: Math.round(input_sgst * 100) / 100,
          igst: Math.round(input_igst * 100) / 100,
          total: Math.round((input_cgst + input_sgst + input_igst) * 100) / 100
        },
        net_gst_payable: {
          cgst: Math.round(net_cgst * 100) / 100,
          sgst: Math.round(net_sgst * 100) / 100,
          igst: Math.round(net_igst * 100) / 100,
          total: Math.round(total_gst_payable * 100) / 100
        },
        invoice_count: invoices.length,
        bill_count: bills.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getCashPosition = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;

    const bankAccounts = await prisma.bankAccount.findMany({
      where: { tenant_id, is_active: true }
    });

    const totalBankBalance = bankAccounts.reduce((s: number, a: any) => s + a.current_balance, 0);

    const today = new Date();
    const next30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const receivablesDue = await prisma.invoiceHeader.findMany({
      where: { tenant_id, status: { in: ['sent', 'partial', 'overdue'] as string[] }, due_date: { lte: next30 } }
    });
    const totalReceivablesDue = receivablesDue.reduce((s: number, i: any) => s + (i.total_amount - i.amount_paid), 0);

    const payablesDue = await prisma.supplierBill.findMany({
      where: { tenant_id, status: { in: ['pending', 'partial'] as string[] }, due_date: { lte: next30 } }
    });
    const totalPayablesDue = payablesDue.reduce((s: number, b: any) => s + (b.total_amount - b.amount_paid), 0);

    const overdueReceivables = await prisma.invoiceHeader.findMany({
      where: { tenant_id, status: 'overdue' }
    });
    const totalOverdue = overdueReceivables.reduce((s: number, i: any) => s + (i.total_amount - i.amount_paid), 0);

    res.json({
      success: true,
      data: {
        bank_balance: Math.round(totalBankBalance),
        bank_accounts: bankAccounts.map((a: any) => ({
          account_name: a.account_name,
          bank_name: a.bank_name,
          balance: a.current_balance
        })),
        receivables_due_30_days: Math.round(totalReceivablesDue),
        payables_due_30_days: Math.round(totalPayablesDue),
        overdue_receivables: Math.round(totalOverdue),
        projected_cash_30_days: Math.round(totalBankBalance + totalReceivablesDue - totalPayablesDue),
        note: 'Projected cash = current bank balance + receivables due in 30 days - payables due in 30 days'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── JOURNAL ENGINE ───────────────────────────────────────────────────────────

async function postJournalEntry(tenant_id: string, data: any) {
  const count = await prisma.journalEntry.count({ where: { tenant_id } });
  const entry_number = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

  const accounts = await prisma.chartOfAccount.findMany({ where: { tenant_id } });
  const getAccount = (code: string) => accounts.find((a: any) => a.account_code === code);

  const linesToCreate = data.lines
    .map((line: any) => {
      const account = getAccount(line.account_code);
      if (!account) return null;
      return {
        tenant_id,
        account_id: account.id,
        debit: line.debit || 0,
        credit: line.credit || 0,
        description: line.description
      };
    })
    .filter(Boolean);

  if (linesToCreate.length === 0) return null;

  const entry = await prisma.journalEntry.create({
    data: {
      tenant_id,
      entry_number,
      entry_date: data.entry_date,
      entry_type: data.entry_type,
      reference_type: data.reference_type,
      reference_id: data.reference_id,
      description: data.description,
      is_reversal: data.is_reversal || false,
      lines: { create: linesToCreate }
    }
  });

  return entry;
}

export const getJournalEntries = async (req: AuthRequest, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id as string;
    const entries = await prisma.journalEntry.findMany({
      where: { tenant_id },
      include: { lines: { include: { account: true } } },
      orderBy: { entry_date: 'desc' },
      take: 100
    });
    res.json({ success: true, data: entries });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
