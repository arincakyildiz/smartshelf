import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import pool from '../config/database';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz istek', details: parsed.error.issues });
    return;
  }
  const { email, password } = parsed.data;

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) {
    res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  const result = await pool.query(
    'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
    [req.user!.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    return;
  }
  res.json(result.rows[0]);
}
