import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { User, Store, UserDoc } from '../models';

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

// Herkese açık kayıt: rol seçilemez, her zaman store_manager olur
const signupSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
  name:     z.string().min(2),
  store_id: z.string().min(1),
});

type UserWithId = UserDoc & { id: string };

function signToken(user: UserWithId): string {
  const signOptions: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, store_id: user.store_id?.toString() },
    process.env.JWT_SECRET!,
    signOptions
  );
}

function publicUser(user: UserWithId) {
  return {
    id: user.id, email: user.email, name: user.name, role: user.role,
    store_id: user.store_id?.toString(),
  };
}

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

  res.json({ token: signToken(user), user: publicUser(user) });
}

// POST /api/auth/signup  (herkese açık)
export async function signup(req: Request, res: Response): Promise<void> {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz istek', details: parsed.error.issues });
    return;
  }
  const { email, password, name, store_id } = parsed.data;

  // Seçilen mağaza geçerli ve aktif olmalı
  const store = await Store.findById(store_id).catch(() => null);
  if (!store || !store.is_active) {
    res.status(400).json({ error: 'Geçerli bir mağaza seçin' });
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ error: 'Bu e-posta zaten kayıtlı' });
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);
  // role açıkça store_manager'a sabitlenir — istemci rol gönderse bile yok sayılır
  const user = await User.create({ email, password_hash, name, role: 'store_manager', store_id });

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}

// GET /api/auth/stores  (kayıt formu için minimal, herkese açık liste)
export async function listStoresForSignup(_req: Request, res: Response): Promise<void> {
  const stores = await Store.find({ is_active: true }, 'name city').sort({ name: 1 }).lean();
  res.json(stores.map((s: any) => ({ id: s._id.toString(), name: s.name, city: s.city })));
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.id).select('-password_hash');
  if (!user) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    return;
  }
  res.json(user);
}
