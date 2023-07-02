import express from 'express';
import { authenticateToken } from '../controllers/authMiddleware';

const router = express.Router();

import { getUserProjectsList, getProjectData } from '../controllers/projectsController';

router.get('/', authenticateToken, getUserProjectsList);
router.get('/:id', authenticateToken, getProjectData);

export default router;
