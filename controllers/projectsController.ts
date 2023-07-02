import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  IAuthenticatedRequest,
  ISpecificProjectParams,
  IProjectDataResponse,
  ProjectDataResponse,
  ProjectListItem,
} from '../database/types';

import { errorHandler, authenticateProjectUser } from './utils';
import { specificProjectParamsSchema } from './validationSchemas';

import ProjectsModel from '../database/models/projects';
import ProjectUsersModel from '../database/models/projectUsers';

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
        return new ProjectListItem(projectData);
      })
    );

    res.json(projectsSimplifiedList);
  } catch (err) {
    errorHandler(err, res);
  }
};

/* -------------------------------- GET PROJECT DATA --------------------------------- */
export const getProjectData = async (req: IAuthenticatedRequest & { params: ISpecificProjectParams }, res: Response) => {
  try {
    await specificProjectParamsSchema.validate(req.params);
    await authenticateProjectUser(req);

    const { id: projectId } = req.params;
    const { id: userId } = req.user;

    const project = await ProjectsModel.findByPk(projectId);

    const projectData: IProjectDataResponse = new ProjectDataResponse({
      ...project.toJSON(),
      userId,
    });

    res.json(projectData);
  } catch (err) {
    errorHandler(err, res);
  }
};
