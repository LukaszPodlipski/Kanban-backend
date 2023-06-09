import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  IAuthenticatedRequest,
  IAuthenticatedRequestWithBody,
  ISpecificProjectParams,
  ProjectListItem,
  IProjectResponse,
  ProjectResponse,
  ProjectColumnResponse,
  TaskResponse,
} from '../database/types';
import { errorHandler } from './utils';

import { specificProjectParamsSchema, createColumnBodySchema, createTaskBodySchema } from './validationSchemas';

import ProjectsModel from '../database/models/projects';
import ProjectUsersModel from '../database/models/projectUsers';
import ProjectColumnsModel from '../database/models/projectColumns';
import TasksModel from '../database/models/tasks';
import UsersModel from '../database/models/users';

/* -------------------------------- GET LIST OF USER'S PROJECTS --------------------------------- */

export const getUserProjectsList = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.user;
    const projectsUser = await ProjectUsersModel.findAll({ where: { userId: id } });

    if (!projectsUser.length) {
      res.status(StatusCodes.NOT_FOUND).json({ error: 'User has no projects' });
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

/* -------------------------------- GET USER'S SINGLE PROJECT --------------------------------- */

export const getUserSingleProject = async (req: IAuthenticatedRequest & { params: ISpecificProjectParams }, res: Response) => {
  try {
    await specificProjectParamsSchema.validate(req.params);

    const { id: userId } = req.user;
    const { id: projectId } = req.params;

    const projectUser = await ProjectUsersModel.findOne({ where: { userId, projectId } });

    if (!projectUser) {
      res.status(StatusCodes.NOT_FOUND).json({ error: 'Project not found' });
    }

    const project = await ProjectsModel.findByPk(projectId, {
      include: [
        {
          model: ProjectColumnsModel,
          include: [
            {
              model: TasksModel,
              include: [
                {
                  model: UsersModel,
                  as: 'createdBy',
                },
                {
                  model: UsersModel,
                  as: 'assignee',
                },
              ],
            },
          ],
        },
      ],
    });

    const completeProject: IProjectResponse = new ProjectResponse({
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.ownerId,
      userId: userId,
      columns: project.projectColumns.map(
        (column) =>
          new ProjectColumnResponse({
            id: column.id,
            name: column.name,
            tasks: column.tasks.map(
              (task) =>
                new TaskResponse({
                  id: task.id,
                  name: task.name,
                  description: task.description,
                  projectColumnId: task.projectColumnId,
                  createdBy: {
                    id: task.createdBy.id,
                    name: task.createdBy.name,
                    surname: task.createdBy.surname,
                  },
                  assignee: {
                    id: task.assignee.id,
                    name: task.assignee.name,
                    surname: task.createdBy.surname,
                  },
                })
            ),
          })
      ),
    });

    res.json(completeProject);
  } catch (err) {
    errorHandler(err, res);
  }
};

/* -------------------------------- ADD NEW COLUMN --------------------------------- */

export async function createColumn(
  req: IAuthenticatedRequestWithBody<{ name: string }> & { params: ISpecificProjectParams },
  res: Response
) {
  try {
    await specificProjectParamsSchema.validate(req.params);
    await createColumnBodySchema.validate(req.body);

    const projectId = Number(req.params.projectId);

    const { name } = req.body;

    const columns = await ProjectColumnsModel.findAll({ where: { projectId } });

    const order = columns.length + 1;

    const project = await ProjectsModel.findByPk(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const column = await ProjectColumnsModel.create({
      name,
      projectId,
      order,
    });

    return res.status(StatusCodes.CREATED).json(column);
  } catch (err) {
    errorHandler(err, res);
  }
}

/* -------------------------------- CREATE NEW TASK --------------------------------- */

export async function createTask(
  req: IAuthenticatedRequestWithBody<{
    description: string;
    name: string;
    createdById: number;
    assigneeId: number;
    projectColumnId: number;
  }> & { params: ISpecificProjectParams },
  res: Response
) {
  try {
    await specificProjectParamsSchema.validate(req.params);
    await createTaskBodySchema.validate(req.body);

    const projectId = Number(req.params.projectId);

    const { name, description, assigneeId, projectColumnId } = req.body;

    const tasks = await TasksModel.findAll({ where: { projectColumnId } });

    const order = tasks.length + 1;

    const createdById = req.user.id;

    const project = await ProjectsModel.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const task = await TasksModel.create({
      name,
      description,
      createdById,
      assigneeId,
      projectId,
      projectColumnId,
      order,
    });

    return res.status(201).json(task);
  } catch (err) {
    errorHandler(err, res);
  }
}
