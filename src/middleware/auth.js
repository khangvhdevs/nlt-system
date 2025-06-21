import { verifyToken } from '../utils/jwt.js';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token); // nên throw lỗi nếu token sai
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.',
      });
    }

    return res.status(401).json({ error: 'Invalid or malformed token' });
  }
};
