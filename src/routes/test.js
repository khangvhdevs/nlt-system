import express from 'express';
import { 
    createFullTestController,
    getTestController,
    getFullTestController,
    submitTestController,
    addQuestionsController,
    updateQuestionsController,
    deleteQuestionController 
} from '../controllers/testController.js';
import { authorize } from '../middleware/authorize.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes in this router
router.use(authMiddleware);

// Group các routes chỉ dành cho admin
const adminRouter = express.Router();
adminRouter.get('/getTest/:id', getFullTestController);
adminRouter.post('/createTest', createFullTestController);
adminRouter.post('/addQuestions', addQuestionsController);
adminRouter.put('/updateQuestions', updateQuestionsController);
adminRouter.delete('/deleteQuestion/:id', deleteQuestionController);
router.use('/admin',authorize('admin'), adminRouter);

// Group các routes cho mọi user đã xác thực
const userRouter = express.Router();
userRouter.get('/:id', getTestController);
userRouter.post('/submit', submitTestController);
router.use('/user',authorize('admin', 'user'), userRouter);
    
export default router;
