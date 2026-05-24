"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const purchase_controller_1 = require("../controllers/purchase.controller");
const router = (0, express_1.Router)();
router.post('/', auth_middleware_1.authenticate, purchase_controller_1.createPO);
router.get('/', auth_middleware_1.authenticate, purchase_controller_1.getPOs);
router.get('/:id/revisions', auth_middleware_1.authenticate, purchase_controller_1.getPORevisions);
router.get('/:id', auth_middleware_1.authenticate, purchase_controller_1.getPOById);
router.put('/:id', auth_middleware_1.authenticate, purchase_controller_1.updatePOStatus);
router.put('/:id/approve', auth_middleware_1.authenticate, async (req, res) => {
    req.body = { status: 'approved' };
    return (0, purchase_controller_1.updatePOStatus)(req, res);
});
router.put('/:id/send', auth_middleware_1.authenticate, async (req, res) => {
    req.body = { status: 'sent' };
    return (0, purchase_controller_1.updatePOStatus)(req, res);
});
router.post('/:id/cancel', auth_middleware_1.authenticate, purchase_controller_1.cancelPO);
router.post('/:id/amend', auth_middleware_1.authenticate, purchase_controller_1.amendPO);
exports.default = router;
