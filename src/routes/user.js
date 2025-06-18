import express from 'express';
import {
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// Routes yêu cầu quyền admin
const adminRouter = express.Router();
adminRouter.post('/', createUser);      // Tạo user mới
adminRouter.put('/:id', updateUser);    // Cập nhật thông tin user
adminRouter.delete('/:id', deleteUser); // Xóa user
router.use('/admin', authorize('admin'), adminRouter);

// Routes cho mọi user đã xác thực
const userRouter = express.Router();
userRouter.get('/:id', getUserById);    // Xem thông tin user
router.use('/', authorize('admin', 'user'), userRouter);

export default router;