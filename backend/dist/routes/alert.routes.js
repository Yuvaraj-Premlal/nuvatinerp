"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const prisma_1 = __importDefault(require("../config/prisma"));
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const alerts = await prisma_1.default.systemAlert.findMany({
            where: { tenant_id },
            orderBy: { created_at: 'desc' },
            take: 50
        });
        res.json({ success: true, data: alerts });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put('/:id/read', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = req.params.id;
        await prisma_1.default.systemAlert.updateMany({
            where: { id, tenant_id },
            data: { is_read: true }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put('/:id/resolve', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const id = req.params.id;
        await prisma_1.default.systemAlert.updateMany({
            where: { id, tenant_id },
            data: { is_resolved: true, resolved_at: new Date() }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
