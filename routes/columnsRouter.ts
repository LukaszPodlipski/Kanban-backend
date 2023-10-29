import express from 'express';
import { authenticateToken } from '../controllers/authMiddleware';

const router = express.Router();

import { getProjectColumns, createColumn, updateColumns } from '../controllers/columnsController';

router.get('/', authenticateToken, getProjectColumns);
router.post('/', authenticateToken, createColumn);
router.patch('/', authenticateToken, updateColumns);

export default router;
