import express from 'express';
import { authenticateToken } from '../controllers/authMiddleware';

const router = express.Router();

import {
  getProjectMembers,
  getProjectMember,
  updateMember,
  checkMemberEmailExistance,
  inviteMembers,
  deleteMember,
} from '../controllers/membersController';

router.get('/', authenticateToken, getProjectMembers);
router.get('/check_email', authenticateToken, checkMemberEmailExistance);
router.get('/:id', authenticateToken, getProjectMember);
router.post('/invite', authenticateToken, inviteMembers);
router.patch('/:id', authenticateToken, updateMember);
router.delete('/:id', authenticateToken, deleteMember);

export default router;
