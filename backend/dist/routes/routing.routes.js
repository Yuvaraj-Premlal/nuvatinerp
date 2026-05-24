"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const routing_controller_1 = require("../controllers/routing.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/', auth_middleware_1.authenticate, routing_controller_1.createRouting);
router.get('/:item_id', auth_middleware_1.authenticate, routing_controller_1.getRoutingByItem);
exports.default = router;
