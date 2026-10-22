import { badRequest } from '../utils/errors.js';

export function requireFields(body, fields) {
  const missing = fields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || String(value).trim() === '';
  });
  if (missing.length) {
    throw badRequest(`Missing required fields: ${missing.join(', ')}`, { missing });
  }
}
