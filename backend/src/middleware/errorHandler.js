import { env } from '../config/env.js';

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const payload = {
    error: true,
    message: status === 500 ? 'Something went wrong.' : err.message,
  };
  if (err.details) payload.details = err.details;
  if (env.nodeEnv !== 'production' && status === 500) {
    payload.debug = err.message;
  }
  if (status >= 500) console.error(err);
  res.status(status).json(payload);
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: true, message: 'Route not found.' });
}
