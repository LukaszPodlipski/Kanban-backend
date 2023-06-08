import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  IAuthenticatedRequest,
  ISpecificProjectParams,
  ProjectListItem,
  IProjectResponse,
  ProjectResponse,
  ProjectColumnResponse,
  TaskResponse,
} from '../database/types';
import { errorHandler } from './utils';

import { specificProjectParamsSchema } from './validationSchemas';

import ProjectsModel from '../database/models/projects';
import ProjectUsersModel from '../database/models/projectUsers';
import ProjectColumns from '../database/models/projectColumns';
import Tasks from '../database/models/tasks';

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

    const project = await ProjectsModel.findOne({ where: { id: projectUser.projectId } }).then((project) => project.toJSON());
    const columns = await ProjectColumns.findAll({ where: { projectId: projectUser.projectId } }).then((projectColumns) =>
      projectColumns.map((column) => column.toJSON())
    );

    const getColumnTasks = async (columnId: number) => {
      const tasks = await Tasks.findAll({ where: { projectColumnId: columnId } }).then((tasks) =>
        tasks.sort((a, b) => a.order - b.order).map((task) => new TaskResponse(task.toJSON()))
      );
      return tasks;
    };

    const formattedProject: IProjectResponse = new ProjectResponse({
      ...project,
      userId,
      columns: await Promise.all(
        columns
          .sort((a, b) => a.order - b.order)
          .map(
            async (column) =>
              new ProjectColumnResponse({
                ...column,
                tasks: await getColumnTasks(column.id),
              })
          )
      ),
    });

    res.json(formattedProject);
  } catch (err) {
    errorHandler(err, res);
  }
};
