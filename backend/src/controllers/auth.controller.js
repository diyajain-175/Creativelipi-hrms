import { login, sessionProfile } from '../services/auth.service.js';
import { postgresUserRepo as userRepo } from '../repositories/postgres/user.repository.js';
import { requireFields } from '../middleware/validate.js';
import { env } from '../config/env.js';

const isProduction = env.nodeEnv === 'production' || env.cookieSecure;

const cookieOpts = {
  httpOnly: true,
  sameSite: isProduction ? 'none' : 'lax',
  secure: isProduction,
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
};

export async function loginHandler(req, res, next) {
  try {
    requireFields(req.body, ['email', 'password']);

    const { token, profile } = await login(
      req.body.email,
      req.body.password
    );

    res.cookie('hrms_token', token, cookieOpts);
    res.json({ token, user: profile });
  } catch (err) {
    next(err);
  }
}

export function logoutHandler(_req, res) {
  res.clearCookie('hrms_token', cookieOpts);
  res.json({ ok: true });
}

export async function meHandler(req, res, next) {
  try {
    const user = await userRepo.findById(req.user.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'Account is not active.',
      });
    }

    const profile = await sessionProfile(user);

    res.json({ user: profile });
  } catch (err) {
    next(err);
  }
}