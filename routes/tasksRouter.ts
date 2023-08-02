import express from 'express';
import { authenticateToken } from '../controllers/authMiddleware';

const router = express.Router();

import { getProjectTasks, getProjectTask, createTask, updateTask, moveTask } from '../controllers/tasksController';

router.get('/', authenticateToken, getProjectTasks);
router.get('/:id', authenticateToken, getProjectTask);
router.post('/', authenticateToken, createTask);
router.patch('/:id', authenticateToken, updateTask);
router.patch('/move/:id', authenticateToken, moveTask);

export default router;
