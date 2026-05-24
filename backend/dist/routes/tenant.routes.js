"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tenant_controller_1 = require("../controllers/tenant.controller");
const router = (0, express_1.Router)();
router.post('/', tenant_controller_1.createTenant);
router.get('/', tenant_controller_1.getTenants);
router.get('/:id', tenant_controller_1.getTenantById);
exports.default = router;
