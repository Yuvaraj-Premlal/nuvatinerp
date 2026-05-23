import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getCompanyConfig, setCompanyConfig,
  getBankAccounts, createBankAccount,
  getInvoices, getInvoiceById, createInvoice, createInvoiceFromDispatch, updateInvoiceStatus,
  getPaymentReceipts, createPaymentReceipt, reversePaymentReceipt,
  createCreditNote,
  getSupplierBills, createSupplierBillFromGRN, createPaymentVoucher, createDebitNote,
  getExpenses, createExpense, reverseExpense,
  getProfitAndLoss, getCustomerAging, getSupplierAging, getGSTSummary, getCashPosition,
  getJournalEntries
} from '../controllers/finance.controller';

const router = Router();

router.get('/config', authenticate, getCompanyConfig);
router.post('/config', authenticate, setCompanyConfig);

router.get('/bank-accounts', authenticate, getBankAccounts);
router.post('/bank-accounts', authenticate, createBankAccount);

router.get('/invoices', authenticate, getInvoices);
router.get('/invoices/:id', authenticate, getInvoiceById);
router.post('/invoices', authenticate, createInvoice);
router.post('/invoices/from-dispatch/:dispatch_id', authenticate, createInvoiceFromDispatch);
router.put('/invoices/:id/status', authenticate, updateInvoiceStatus);

router.get('/receipts', authenticate, getPaymentReceipts);
router.post('/receipts', authenticate, createPaymentReceipt);
router.post('/receipts/:id/reverse', authenticate, reversePaymentReceipt);

router.post('/credit-notes', authenticate, createCreditNote);

router.get('/bills', authenticate, getSupplierBills);
router.post('/bills/from-grn/:grn_id', authenticate, createSupplierBillFromGRN);
router.post('/vouchers', authenticate, createPaymentVoucher);
router.post('/debit-notes', authenticate, createDebitNote);

router.get('/expenses', authenticate, getExpenses);
router.post('/expenses', authenticate, createExpense);
router.post('/expenses/:id/reverse', authenticate, reverseExpense);

router.get('/reports/pl', authenticate, getProfitAndLoss);
router.get('/reports/customer-aging', authenticate, getCustomerAging);
router.get('/reports/supplier-aging', authenticate, getSupplierAging);
router.get('/reports/gst', authenticate, getGSTSummary);
router.get('/reports/cash-position', authenticate, getCashPosition);
router.get('/journal', authenticate, getJournalEntries);

export default router;
