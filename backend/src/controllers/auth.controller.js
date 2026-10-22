import { login, sessionProfile } from '../services/auth.service.js';
import { userRepo } from '../repositories/index.js';
import { env } from '../config/env.js';
import { requireFields } from '../middleware/validate.js';

const cookieOpts = {
  httpOnly: true,
  sameSite: 'none',
  secure: true,
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
};

export async function loginHandler(req, res, next) {
  try {
    requireFields(req.body, ['email', 'password']);
    const { token, profile } = await login(req.body.email, req.body.password);
    res.cookie('hrms_token', token, cookieOpts);
    res.json({ token, user: profile });
  } catch (err) {
    next(err);
  }
}

export function logoutHandler(_req, res) {
  res.clearCookie('hrms_token', { path: '/' });
  res.json({ ok: true });
}

export function meHandler(req, res, next) {
  try {
    const user = userRepo.findById(req.user.id);
    res.json({ user: sessionProfile(user) });
  } catch (err) {
    next(err);
  }
}
