import express from 'express';
import { authenticateToken } from '../controllers/authMiddleware';

const router = express.Router();

import { getUserProjectsList, getProjectData, updateProjectData, createProject } from '../controllers/projectsController';

router.get('/', authenticateToken, getUserProjectsList);
router.get('/:id', authenticateToken, getProjectData);
router.patch('/:id', authenticateToken, updateProjectData);
router.post('/', authenticateToken, createProject);

export default router;
