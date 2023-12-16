import express from 'express';
import { authenticateToken } from '../controllers/authMiddleware';

const router = express.Router();

import {
  getUserProjectsList,
  getProjectData,
  updateProjectData,
  createProject,
  deleteProject,
} from '../controllers/projectsController';

router.get('/', authenticateToken, getUserProjectsList);
router.get('/:id', authenticateToken, getProjectData);
router.patch('/:id', authenticateToken, updateProjectData);
router.post('/', authenticateToken, createProject);
router.delete('/:id', authenticateToken, deleteProject);

export default router;
