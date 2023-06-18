import express from 'express';
import { authenticateToken } from '../controllers/authMiddleware';

const router = express.Router();

import { createTask, moveTask } from '../controllers/tasksController';

router.patch('/move/:id', authenticateToken, moveTask);
router.post('/create/:id', authenticateToken, createTask);

export default router;
