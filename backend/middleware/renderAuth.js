import { protect, isAdmin } from './authMiddleware.js';

/**
 * Allow request if either:
 * 1. Render token is provided (query.token, x-render-token, or Authorization: Bearer <token>) and matches RENDER_TOKEN, or
 * 2. User is authenticated and is admin (JWT).
 */
export function renderOrAdmin(req, res, next) {
  const raw =
    req.query.token ? String(req.query.token) :
    req.headers['x-render-token'] ? String(req.headers['x-render-token']) :
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer '))
      ? req.headers.authorization.slice(7)
      : null;

  const secret = process.env.RENDER_TOKEN;
  if (secret && raw && raw === secret) {
    return next();
  }
  protect(req, res, () => {
    isAdmin(req, res, next);
  });
}
