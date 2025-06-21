import express from 'express';
import * as authController from '../controllers/auth.js';
import accountRateLimiter from '../middleware/accountRateLimit.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', accountRateLimiter, authController.login);

export default router;
