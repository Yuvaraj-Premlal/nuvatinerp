"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const login = async (req, res) => {
    try {
        const { email, password, tenant_code } = req.body;
        const tenant = await prisma_1.default.tenant.findUnique({
            where: { code: tenant_code }
        });
        if (!tenant) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        const user = await prisma_1.default.user.findFirst({
            where: { email, tenant_id: tenant.id, is_active: true }
        });
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({
            user_id: user.id,
            tenant_id: tenant.id,
            tenant_code: tenant.code,
            role: user.role
        }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role,
                    tenant_id: tenant.id,
                    tenant_name: tenant.name
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.login = login;
