import express from 'express';
import { authenticateToken } from '../controllers/authMiddleware';

const router = express.Router();

import { getProjectMembers } from '../controllers/membersController';

router.get('/', authenticateToken, getProjectMembers);

export default router;
