"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const toc_controller_1 = require("../controllers/toc.controller");
const toc_scheduler_1 = require("../jobs/toc.scheduler");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/detect-constraint', auth_middleware_1.authenticate, toc_controller_1.detectConstraint);
router.post('/constraint', auth_middleware_1.authenticate, toc_controller_1.setConstraintConfig);
router.get('/constraint', auth_middleware_1.authenticate, toc_controller_1.getConstraintConfig);
router.get('/priority-queue', auth_middleware_1.authenticate, toc_controller_1.getPriorityQueue);
router.get('/buffer', auth_middleware_1.authenticate, toc_controller_1.getBufferStatus);
router.get('/shift-summary', auth_middleware_1.authenticate, toc_controller_1.getShiftSummary);
router.get('/dashboard', auth_middleware_1.authenticate, toc_controller_1.getDashboard);
router.post('/run-now', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id;
        const result = await (0, toc_scheduler_1.runTOCSchedule)(tenant_id);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
