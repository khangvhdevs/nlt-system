import redis from '../utils/redis.js';
import { createSpamLog, getRateLimitCount } from '../models/spamLog.js';

export const loginRateLimiter = async (req, res, next) => {
  const email = req.body?.email;
  const ip = req.ip;
  const ua = req.headers['user-agent'];

  if (!email) return res.status(400).json({ message: 'Email is required' });

  const lockKey = `lock:${email}`;
  const countKey = `attempt:${email}`;

  // ✅ Nếu đang bị khóa → không xử lý gì thêm
  const isLocked = await redis.ttl(lockKey);
  const minutesLeft = Math.ceil(isLocked / 60);
  if (isLocked > 0) {
    return res.status(429).json({
      error: 'account_locked',
      code: 429,
      message: `Tài khoản đang bị tạm khóa. Vui lòng thử lại sau ${minutesLeft} phút.`
    });
  }

  // Tăng số lần sai
  const attempts = await redis.incr(countKey);
  if (attempts === 1) {
    await redis.expire(countKey, 15 * 60); // 15 phút
  }

  // Nếu vượt giới hạn 5 lần → khóa tài khoản
  if (attempts >= 5) {
    const level = await getRateLimitCount(email);
    let lockTime;

    if (level === 0) lockTime = 10 * 60;
    else if (level === 1) lockTime = 30 * 60;
    else if (level >= 2) lockTime = 60 * 60;

    await redis.set(lockKey, '1', 'EX', lockTime); // ⛔ khóa
    await redis.del(countKey); // reset đếm
    await createSpamLog(email, ip, ua, 'rate-limit');

    return res.status(429).json({
      message: `Bạn đã bị khóa đăng nhập trong ${lockTime / 60} phút.`
    });
  }

  next(); // Cho phép đăng nhập nếu chưa bị chặn
};
