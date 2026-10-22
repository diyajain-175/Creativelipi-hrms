import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from '../utils/errors.js';
import { userRepo } from '../repositories/index.js';

export async function requireAuth(req, _res, next) {
  try {
    const token = readToken(req);
    if (!token) throw unauthorized('Please sign in.');
    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      throw unauthorized('Session expired. Please sign in again.');
    }
    const user = userRepo.findById(payload.sub);
    if (!user || !user.isActive) throw unauthorized('Account is not active.');
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function readToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.hrms_token;
}
