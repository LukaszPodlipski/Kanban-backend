import express from 'express';
import { authenticateToken } from '../controllers/authMiddleware';

const router = express.Router();

import { getProjectColumns, createColumn } from '../controllers/columnsController';

router.get('/', authenticateToken, getProjectColumns);
router.post('/:id', authenticateToken, createColumn);

export default router;
