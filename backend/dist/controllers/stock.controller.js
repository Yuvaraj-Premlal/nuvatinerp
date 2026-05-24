"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueMaterial = exports.getStockMovements = exports.getStockBalanceByItem = exports.getStockBalance = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getStockBalance = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const ledger = await prisma_1.default.stockLedger.groupBy({
            by: ['item_id'],
            where: { tenant_id },
            _sum: { quantity: true }
        });
        const items = await prisma_1.default.itemMaster.findMany({
            where: { tenant_id, is_active: true },
            include: { pfep_detail: true }
        });
        const balance = items.map((item) => {
            const ledgerEntry = ledger.find((l) => l.item_id === item.id);
            const qty = ledgerEntry?._sum?.quantity || 0;
            const reorder = item.pfep_detail?.reorder_point || 0;
            return {
                item_id: item.id,
                item_code: item.item_code,
                item_name: item.item_name,
                item_type: item.item_type,
                unit_of_measure: item.unit_of_measure,
                quantity_on_hand: qty,
                reorder_point: reorder,
                safety_stock: item.pfep_detail?.safety_stock || 0,
                below_reorder: qty <= reorder,
                storage_location: item.pfep_detail?.storage_location
            };
        });
        res.json({ success: true, data: balance });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getStockBalance = getStockBalance;
const getStockBalanceByItem = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const item_id = req.params.item_id;
        const ledger = await prisma_1.default.stockLedger.findMany({
            where: { tenant_id, item_id },
            orderBy: { transacted_at: 'desc' }
        });
        const total = ledger.reduce((sum, l) => sum + l.quantity, 0);
        res.json({ success: true, data: { quantity_on_hand: total, movements: ledger } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getStockBalanceByItem = getStockBalanceByItem;
const getStockMovements = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const movements = await prisma_1.default.stockLedger.findMany({
            where: { tenant_id },
            orderBy: { transacted_at: 'desc' },
            take: 100
        });
        res.json({ success: true, data: movements });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getStockMovements = getStockMovements;
const issueMaterial = async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const { job_id, item_id, planned_qty, issued_qty, issued_by } = req.body;
        const issue = await prisma_1.default.materialIssue.create({
            data: { tenant_id, job_id, item_id, planned_qty, issued_qty, issued_by }
        });
        await prisma_1.default.stockLedger.create({
            data: {
                tenant_id,
                item_id,
                transaction_type: 'issue',
                quantity: -issued_qty,
                reference_type: 'job_card',
                reference_id: job_id
            }
        });
        res.status(201).json({ success: true, data: issue });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.issueMaterial = issueMaterial;
