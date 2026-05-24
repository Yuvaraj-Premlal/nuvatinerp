"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bom_controller_1 = require("../controllers/bom.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/', auth_middleware_1.authenticate, bom_controller_1.createBom);
router.get('/:item_id', auth_middleware_1.authenticate, bom_controller_1.getBomByItem);
exports.default = router;
