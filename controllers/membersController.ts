import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { IAuthenticatedRequestWithBody, IAuthenticatedRequestWithQuery, ISpecificItemParams, Member } from '../database/types';
import { errorHandler, authenticateProjectUser, isProjectAdmin } from './utils';
import { getProjectResourceParamsSchema, updateMemberBodySchema, inviteMembersParamsSchema } from './validationSchemas';
import { sendWebSocketMessage } from '../websocket';

import ProjectsModel from '../database/models/projects';
import ProjectUsers from '../database/models/projectUsers';
import UsersModel from '../database/models/users';
import TasksModel from '../database/models/tasks';

const getParsedMember = async (projectId: number, userId: number) => {
  const user = await UsersModel.findByPk(userId).then((user) => user?.toJSON());
  const projectUser = await ProjectUsers.findOne({ where: { userId, projectId } }).then((projectUser) => projectUser?.toJSON());
  const memberData = {
    ...user,
    createdAt: projectUser?.createdAt.toString(),
    role: projectUser?.role,
  };
  return new Member(memberData);
};

export async function getProjectMembers(req: IAuthenticatedRequestWithQuery<{ projectId: string }>, res: Response) {
  try {
    await getProjectResourceParamsSchema.validate(req.query);
    await authenticateProjectUser(req);

    const { projectId } = req.query || {};

    const project = await ProjectsModel.findByPk(projectId);

    if (!project) {
      res.status(StatusCodes.NOT_FOUND).json({ error: 'Project not found' });
      return;
    }

    const members = await ProjectUsers.findAll({ where: { projectId } });

    const formattedMembers = await Promise.all(
      members.map(async (member) => {
        return await getParsedMember(Number(projectId), member.userId);
      })
    );

    return res.json(formattedMembers);
  } catch (err) {
    errorHandler(err, res);
  }
}

export async function getProjectMember(req: IAuthenticatedRequestWithQuery<{ projectId: string }>, res: Response) {
  try {
    await getProjectResourceParamsSchema.validate(req.query);
    await authenticateProjectUser(req);

    const { projectId } = req.query || {};
    const { id: userId } = req.params || {};

    const project = await ProjectsModel.findByPk(projectId);

    if (!project) {
      res.status(StatusCodes.NOT_FOUND).json({ error: 'Project not found' });
      return;
    }

    const member = await ProjectUsers.findOne({ where: { projectId, userId } });

    if (!member) {
      res.status(StatusCodes.NOT_FOUND).json({ error: 'Member not found' });
      return;
    }

    const parsedMember = await getParsedMember(Number(projectId), Number(userId));
    return res.json(parsedMember);
  } catch (err) {
    errorHandler(err, res);
  }
}

export async function updateMember(req: IAuthenticatedRequestWithQuery<{ projectId: string }>, res: Response) {
  try {
    await updateMemberBodySchema.validate(req.query);
    await authenticateProjectUser(req);

    const { projectId } = req.body || {};
    const { id: userId } = req.params || {};
    const { role } = req.body || {};

    const member = await ProjectUsers.findOne({ where: { userId } });

    if (!member) {
      res.status(StatusCodes.NOT_FOUND).json({ error: 'Member not found' });
      return;
    }

    await member.update({ role });

    const permittedUsers = await ProjectUsers.findAll({ where: { projectId } }).then((users) => users.map((user) => user.userId));

    const memberResponse = await getParsedMember(Number(projectId), Number(userId));

    const payload = {
      data: memberResponse,
      itemType: 'member',
      messageType: 'update',
      receiversIds: permittedUsers,
    };

    sendWebSocketMessage({ ...payload, channel: 'MembersIndexChannel', channelParams: { projectId } });
    sendWebSocketMessage({
      ...payload,
      channel: 'MemberIndexChannel',
      channelParams: { projectId, memberId: memberResponse.id },
    });

    res.json(member);
  } catch (err) {
    errorHandler(err, res);
  }
}

export async function checkMemberEmailExistance(
  req: IAuthenticatedRequestWithQuery<{ projectId: string; email: string }>,
  res: Response
) {
  try {
    await getProjectResourceParamsSchema.validate(req.query);
    await authenticateProjectUser(req);

    const { email } = req.query || {};

    const user = await UsersModel.findOne({ where: { email } });

    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' });
      return;
    }

    if (user.id === req.user.id) {
      res.status(StatusCodes.FORBIDDEN).json({ error: 'You already belong to this project' });
      return;
    }

    const { id, avatarUrl } = user;

    res.json({ email, id, avatarUrl });
  } catch (err) {
    errorHandler(err, res);
  }
}

type invitedMemberType = {
  id: number;
  role: string;
};

export async function inviteMembers(
  req: IAuthenticatedRequestWithBody<{
    users: invitedMemberType[];
    projectId: number;
  }> & { params: ISpecificItemParams },
  res: Response
) {
  try {
    await inviteMembersParamsSchema.validate(req.body);
    await authenticateProjectUser(req);
    const { projectId, users } = req.body || {};
    console.log('projectId, users: ', projectId, users);
    return res.status(StatusCodes.OK).send();
  } catch (err) {
    errorHandler(err, res);
  }
}

export async function deleteMember(req: IAuthenticatedRequestWithQuery<{ id: string }>, res: Response) {
  try {
    const { id: memberId } = req.params || {};
    const { id: userId } = req.user || {};

    const member = await ProjectUsers.findOne({ where: { id: Number(memberId) } });
    const { projectId } = member?.toJSON() || {};

    if (!member) {
      res.status(StatusCodes.NOT_FOUND).json({ error: 'Member not found' });
      return;
    }
    // 0. Check if request user belongs to project
    await authenticateProjectUser({ ...req, params: { projectId } });

    const userProjectMember = await ProjectUsers.findOne({ where: { userId, projectId } }).then((user) => user?.toJSON());

    // 1. Check if request user is allowed to delete members
    if (!isProjectAdmin(userProjectMember.role)) {
      res.status(StatusCodes.FORBIDDEN).json({ error: 'You are not permitted to delete members' });
      return;
    }

    // 2. Check if request user is trying to delete himself
    if (member.userId === req.user.id) {
      res.status(StatusCodes.FORBIDDEN).json({ error: 'You cannot remove yourself from project' });
      return;
    }

    // 3. Check if request user is trying to delete owner
    if (member.role === 'Owner') {
      res.status(StatusCodes.FORBIDDEN).json({ error: 'You cannot remove owner from project' });
      return;
    }

    // 4. Check if request user is trying to delete maintainer
    if (member.role === 'Maintainer' && userProjectMember.role === 'Maintainer') {
      res.status(StatusCodes.FORBIDDEN).json({ error: 'You cannot reomove maintainer from project' });
      return;
    }

    // 5. Null all tasks assigned to member
    const memberTasks = await TasksModel.findAll({ where: { assigneeId: memberId } });
    await Promise.all(memberTasks.map((task) => task.update({ assigneeId: null })));

    // 6. Delete member

    await member.destroy();

    const permittedUsers = await ProjectUsers.findAll({ where: { projectId } }).then((users) => users.map((user) => user.userId));

    const payload = {
      data: { id: memberId },
      itemType: 'member',
      messageType: 'delete',
      receiversIds: permittedUsers,
    };

    sendWebSocketMessage({ ...payload, channel: 'MembersIndexChannel', channelParams: { projectId } });
    sendWebSocketMessage({
      ...payload,
      channel: 'MemberIndexChannel',
      channelParams: { projectId, memberId },
    });

    res.json(member);
  } catch (err) {
    errorHandler(err, res);
  }
}
