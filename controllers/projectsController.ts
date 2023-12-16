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
import { specificItemParamsSchema, createProjectBodySchema } from './validationSchemas';

import ProjectsModel from '../database/models/projects';
import TasksModel from '../database/models/tasks';
import ProjectUsersModel from '../database/models/projectUsers';
import ProjectColumnsModel from '../database/models/projectColumns';
import { sendWebSocketMessage } from '../websocket';

import { sendProjectInvitation } from './membersController';

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

/* -------------------------------- CREATE PROJECT --------------------------------- */
export const createProject = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { id: userId } = req.user;
    const { name, prefix, description, members, columns } = req.body;

    // 1. Check request body schema
    await createProjectBodySchema.validate(req.body);

    // 2. Create project
    const newProject = await ProjectsModel.create({ name, prefix, description, ownerId: userId });

    // 3. Create first project user
    await ProjectUsersModel.create({ userId, projectId: newProject.id, role: 'Owner' });

    // 4. Create project column
    columns?.forEach((column) => {
      const { name, description, color, order } = column;
      ProjectColumnsModel.create({ name, description, color, order, projectId: newProject.id });
    });

    // 5. Invite project members
    await sendProjectInvitation({ projectId: newProject.id, members });

    // 6. Send websocket message to project creator
    const WSPayload = {
      data: newProject,
      itemType: 'project',
      messageType: 'create',
      channel: 'UserProjectsIndexChannel',
      channelParams: {},
      receiversIds: [userId],
    };

    sendWebSocketMessage(WSPayload);

    res.status(StatusCodes.CREATED).json(newProject);
  } catch (err) {
    errorHandler(err, res);
  }
};

/* -------------------------------- DELETE PROJECT --------------------------------- */
// remove all column, project users, and tasks related to this project
export const deleteProject = async (req: IAuthenticatedRequest & { params: ISpecificItemParams }, res: Response) => {
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

    // Check if user is project owner
    const { role } = await ProjectUsersModel.findOne({ where: { projectId, userId: req.user.id } }).then((user) =>
      user?.toJSON()
    );

    if (role !== 'Owner') {
      res.status(StatusCodes.FORBIDDEN).json({ error: 'You are not allowed to delete this project' });
      return;
    }

    // Delete flow

    // 1. Delete project tasks
    await TasksModel.destroy({ where: { projectId } });

    // 2. Delete project columns
    await ProjectColumnsModel.destroy({ where: { projectId } });

    // 3. Delete project users
    await ProjectUsersModel.destroy({ where: { projectId } });

    // 4. Delete project
    await project.destroy();

    // 5. Send websocket message to project creator
    const WSPayload = {
      data: project,
      itemType: 'project',
      messageType: 'delete',
      channel: 'UserProjectsIndexChannel',
      channelParams: {},
      receiversIds: [project.ownerId],
    };

    sendWebSocketMessage(WSPayload);

    res.status(StatusCodes.OK).send();
  } catch (err) {
    errorHandler(err, res);
  }
};
