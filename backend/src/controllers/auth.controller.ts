import { Request, Response } from 'express';
import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, tenant_code } = req.body;

    const tenant = await prisma.tenant.findUnique({
      where: { code: tenant_code }
    });

    if (!tenant) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = await prisma.user.findFirst({
      where: { email, tenant_id: tenant.id, is_active: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        user_id: user.id,
        tenant_id: tenant.id,
        tenant_code: tenant.code,
        role: user.role
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
