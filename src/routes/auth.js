import express from 'express';
import * as authController from '../controllers/auth.js';
import  {loginRateLimiter} from '../middleware/rateLimiter.js';
import { refresh } from '../controllers/refreshController.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validations/auth.schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', validate(loginSchema), loginRateLimiter, authController.login);
router.post('/refresh', refresh);
router.post('/changePassword', authMiddleware, authController.changePassword);

export default router;
