"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = exports.createUser = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const createUser = async (req, res) => {
    try {
        const { tenant_id, email, password, first_name, last_name, role } = req.body;
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: {
                tenant_id,
                email,
                password: hashed,
                first_name,
                last_name,
                role
            }
        });
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({ success: true, data: userWithoutPassword });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createUser = createUser;
const getUsers = async (req, res) => {
    try {
        const tenant_id = req.params.tenant_id;
        const users = await prisma_1.default.user.findMany({
            where: { tenant_id, is_active: true },
            select: {
                id: true,
                tenant_id: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
                is_active: true,
                created_at: true
            }
        });
        res.json({ success: true, data: users });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getUsers = getUsers;
