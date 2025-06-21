import rateLimit from 'express-rate-limit';

// Rate limiter for login attempts per account (username or email)
const accountRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each account to 5 requests per windowMs
  keyGenerator: (req) => {
    // Use username or email as the key; fallback to IP if not present
    return req.body.username || req.body.email || req.ip;
  },
  message: {
    error: 'Too many login attempts',
    message: 'Please try again after 15 minutes.'
  }
});

export default accountRateLimiter;
