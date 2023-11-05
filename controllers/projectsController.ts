import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  IAuthenticatedRequest,
  ISpecificItemParams,
  IProjectDataResponse,
  ProjectDataResponse,
  SimplifiedProject,
} from '../database/types';

import { errorHandler, authenticateProjectUser } from './utils';
import { specificItemParamsSchema } from './validationSchemas';

import ProjectsModel from '../database/models/projects';
import ProjectUsersModel from '../database/models/projectUsers';

import { sendWebSocketMessage } from '../websocket';

/* -------------------------------- GET LIST OF USER'S PROJECTS --------------------------------- */
export const getUserProjectsList = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.user;
    const projectsUser = await ProjectUsersModel.findAll({ where: { userId: id } });

    if (!projectsUser.length) {
      res.status(StatusCodes.NOT_FOUND).json({ error: 'User has no projects' });
      return;
    }

    const projectsSimplifiedList = await Promise.all(
      projectsUser.map(async (project) => {
        const projectData = await ProjectsModel.findOne({ where: { id: project.projectId } });
        return new SimplifiedProject(projectData);
      })
    );

    res.json(projectsSimplifiedList);
  } catch (err) {
    errorHandler(err, res);
  }
};

/* -------------------------------- GET PROJECT DATA --------------------------------- */
export const getProjectData = async (req: IAuthenticatedRequest & { params: ISpecificItemParams }, res: Response) => {
  try {
    await specificItemParamsSchema.validate(req.params);
    await authenticateProjectUser(req);

    const { id: projectId } = req.params;
    const { id: userId } = req.user;

    const project = await ProjectsModel.findByPk(projectId);
    const projectUser = await ProjectUsersModel.findOne({ where: { projectId, userId } }).then((user) => user?.toJSON());

    const projectData: IProjectDataResponse = new ProjectDataResponse({
      ...project.toJSON(),
      userId,
      role: projectUser.role,
    });

    res.json(projectData);
  } catch (err) {
    errorHandler(err, res);
  }
};

/* -------------------------------- UPDATE PROJECT DATA --------------------------------- */
export const updateProjectData = async (req: IAuthenticatedRequest & { params: ISpecificItemParams }, res: Response) => {
  try {
    await specificItemParamsSchema.validate(req.params);
    await authenticateProjectUser(req);

    const { id } = req.params;
    const projectId = Number(id);

    const project = await ProjectsModel.findByPk(projectId);

    if (!project) {
      res.status(StatusCodes.NOT_FOUND).json({ error: 'Project not found' });
      return;
    }

    const { name, description } = req.body;

    const updatePayload = { name: name || project.name, description: description || project.description };

    await project.update(updatePayload);

    const permittedUsers = await ProjectUsersModel.findAll({ where: { projectId } }).then((users) =>
      users.map((user) => user.userId)
    );

    const WSPayload = {
      data: updatePayload,
      itemType: 'project',
      messageType: 'update',
      channel: 'ProjectIndexChannel',
      channelParams: { projectId },
      receiversIds: permittedUsers,
    };

    sendWebSocketMessage(WSPayload);

    return res.status(StatusCodes.OK).send();
  } catch (err) {
    errorHandler(err, res);
  }
};
