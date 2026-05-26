"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const batch_controller_1 = require("../controllers/batch.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticate, batch_controller_1.getBatches);
router.get('/:batch_number', auth_middleware_1.authenticate, batch_controller_1.getBatchTrace);
exports.default = router;
