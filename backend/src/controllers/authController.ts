import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models';

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
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    signOptions
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
