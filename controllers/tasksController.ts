import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { IAuthenticatedRequestWithBody, ISpecificProjectParams } from '../database/types';
import { errorHandler } from './utils';

import { specificProjectParamsSchema, createTaskBodySchema, moveTaskBodySchema } from './validationSchemas';

import ProjectsModel from '../database/models/projects';
import ProjectUsers from '../database/models/projectUsers';
import TasksModel from '../database/models/tasks';

import { sendWebSocketMessage } from '../websocket';

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

    return res.status(StatusCodes.OK).json(task);
  } catch (err) {
    errorHandler(err, res);
  }
}

/* -------------------------------- MOVE TASK --------------------------------- */
export async function moveTask(
  req: IAuthenticatedRequestWithBody<{
    targetColumnId: number;
    targetIndex: number;
  }> & { params: ISpecificProjectParams },
  res: Response
) {
  try {
    await specificProjectParamsSchema.validate(req.params);
    await moveTaskBodySchema.validate(req.body);

    const { targetColumnId, targetIndex } = req.body;
    const { id: taskId } = req.params;

    const movedTaskModel = await TasksModel.findByPk(taskId);

    if (!movedTaskModel) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const movedTask = movedTaskModel?.toJSON();

    const columnChanged = targetColumnId !== movedTask.projectColumnId;

    const targetColumnTasksModel = await TasksModel.findAll({ where: { projectColumnId: targetColumnId } });

    const targetColumnTasks = targetColumnTasksModel.map((task) => task.toJSON()).sort((a, b) => a.order - b.order);

    if (columnChanged) {
      targetColumnTasks.splice(targetIndex, 0, movedTask);
    } else {
      const elementIndex = targetColumnTasks.findIndex((task) => task.id === movedTask.id);
      targetColumnTasks.splice(elementIndex, 1);
      targetColumnTasks.splice(targetIndex, 0, movedTask);
    }

    const updatedTasks = targetColumnTasks.map((task, index) => {
      return {
        ...task,
        order: index + 1,
      };
    });

    updatedTasks.map((task) => {
      return TasksModel.update(
        {
          order: task.order,
        },
        {
          where: {
            id: task.id,
          },
        }
      );
    });

    if (columnChanged) {
      await TasksModel.update(
        {
          projectColumnId: targetColumnId,
        },
        {
          where: {
            id: taskId,
          },
        }
      );
    }

    const permittedUsers = await ProjectUsers.findAll({ where: { projectId: movedTask.projectId } }).then((users) =>
      users.map((user) => user.userId)
    );

    const updatedTask = updatedTasks.find((task) => task.id === movedTask.id);

    sendWebSocketMessage(updatedTask, 'TasksIndexChannel', permittedUsers, 'update');

    return res.status(200).send();
  } catch (err) {
    errorHandler(err, res);
  }
}
