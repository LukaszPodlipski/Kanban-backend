import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { IAuthenticatedRequestWithQuery, SimplifiedUser } from '../database/types';
import { errorHandler, authenticateProjectUser } from './utils';
import { getProjectResourceParamsSchema } from './validationSchemas';

import ProjectsModel from '../database/models/projects';
import ProjectUsers from '../database/models/projectUsers';
import UsersModel from '../database/models/users';

export async function getProjectMembers(req: IAuthenticatedRequestWithQuery<{ id: string }>, res: Response) {
  try {
    await getProjectResourceParamsSchema.validate(req.query);
    await authenticateProjectUser(req);

    const { id: projectId } = req.query || {};

    const project = await ProjectsModel.findByPk(projectId);

    if (!project) {
      res.status(StatusCodes.NOT_FOUND).json({ error: 'Project not found' });
      return;
    }

    const members = await ProjectUsers.findAll({ where: { projectId } });

    const formattedMembers = await Promise.all(
      members.map(async (member) => {
        const memberData = await UsersModel.findByPk(member.userId);
        return new SimplifiedUser(memberData);
      })
    );

    return res.json(formattedMembers);
  } catch (err) {
    errorHandler(err, res);
  }
}
