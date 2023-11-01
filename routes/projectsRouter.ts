import express from 'express';
import { authenticateToken } from '../controllers/authMiddleware';

const router = express.Router();

import { getUserProjectsList, getProjectData, updateProjectData } from '../controllers/projectsController';

router.get('/', authenticateToken, getUserProjectsList);
router.get('/:id', authenticateToken, getProjectData);
router.patch('/:id', authenticateToken, updateProjectData);

export default router;
