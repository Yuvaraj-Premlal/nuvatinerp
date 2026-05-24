"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const factory_controller_1 = require("../controllers/factory.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/status', auth_middleware_1.authenticate, factory_controller_1.getFactoryStatus);
exports.default = router;
