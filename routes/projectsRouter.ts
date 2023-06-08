import express from 'express';
import { authenticateToken } from '../controllers/authMiddleware';

const router = express.Router();

import { getUserProjectsList, getUserSingleProject } from '../controllers/projectsController';

router.get('/', authenticateToken, getUserProjectsList);

router.get('/:id', authenticateToken, getUserSingleProject);

export default router;
