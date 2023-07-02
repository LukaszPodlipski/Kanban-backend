import express from 'express';
import { authenticateToken } from '../controllers/authMiddleware';

const router = express.Router();

import { getProjectTasks, createTask, moveTask } from '../controllers/tasksController';

router.get('/', authenticateToken, getProjectTasks);
router.post('/create/:id', authenticateToken, createTask);
router.patch('/move/:id', authenticateToken, moveTask);

export default router;
