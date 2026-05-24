"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pfep_controller_1 = require("../controllers/pfep.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/:item_id', auth_middleware_1.authenticate, pfep_controller_1.createOrUpdatePfep);
router.get('/:item_id', auth_middleware_1.authenticate, pfep_controller_1.getPfepByItem);
exports.default = router;
