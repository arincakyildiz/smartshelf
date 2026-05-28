import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
  name:     z.string().min(2),
  role:     z.enum(['admin', 'store_manager']).optional().default('store_manager'),
  store_id: z.string().optional(),
});

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz istek', details: parsed.error.issues });
    return;
  }
  const { email, password, name, role, store_id } = parsed.data;

  if (role === 'store_manager' && !store_id) {
    res.status(400).json({ error: 'Store manager için store_id zorunlu' });
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ error: 'Bu e-posta zaten kayıtlı' });
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password_hash, name, role, store_id });

  res.status(201).json({
    id: user.id, email: user.email, name: user.name, role: user.role, store_id: user.store_id,
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz istek', details: parsed.error.issues });
    return;
  }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    return;
  }

  const signOptions: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, store_id: user.store_id?.toString() },
    process.env.JWT_SECRET!,
    signOptions
  );

  res.json({
    token,
    user: {
      id: user.id, email: user.email, name: user.name, role: user.role,
      store_id: user.store_id?.toString(),
    },
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.id).select('-password_hash');
  if (!user) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    return;
  }
  res.json(user);
}
