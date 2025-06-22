import express from 'express';
import * as authController from '../controllers/auth.js';
import accountRateLimiter from '../middleware/accountRateLimit.js';
import { refresh } from '../controllers/refreshController.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', accountRateLimiter, authController.login);
router.post('/refresh', refresh);

export default router;
