import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { IAuthenticatedRequestWithBody, ISpecificProjectParams, TaskResponse } from '../database/types';
import { errorHandler } from './utils';

import { specificProjectParamsSchema, createTaskBodySchema, moveTaskBodySchema } from './validationSchemas';

import ProjectsModel from '../database/models/projects';
import ProjectUsers from '../database/models/projectUsers';
import Users from '../database/models/users';
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
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Project not found' });
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
    const getTaskResponse = async (task) => {
      const createdBy = await Users.findOne({ where: { id: task?.createdById } });
      const assignee = await Users.findOne({ where: { id: task?.assigneeId } });

      const formattedTask = {
        ...task,
        assignee: {
          id: assignee?.id,
          fullName: `${assignee.name} ${assignee.surname}`,
        },
        createdBy: {
          id: createdBy?.id,
          fullName: `${createdBy.name} ${createdBy.surname}`,
        },
      };

      return new TaskResponse(formattedTask);
    };

    await specificProjectParamsSchema.validate(req.params);
    await moveTaskBodySchema.validate(req.body);

    const { targetColumnId, targetIndex } = req.body;
    const { id: taskId } = req.params;

    // 1. get moved task from database
    const movedTask = await TasksModel.findByPk(taskId).then((task) => task?.toJSON());

    // 2. Check task existence and user permissions
    const permittedUsers = await ProjectUsers.findAll({ where: { projectId: movedTask.projectId } }).then((users) =>
      users.map((user) => user.userId)
    );

    if (!movedTask) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Task not found' });
    }

    if (!permittedUsers.includes(req.user.id)) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: 'You are not permitted to move this task' });
    }

    // 3.check if column has changed
    const isColumnChange = targetColumnId && targetColumnId !== movedTask.projectColumnId;

    // 4. get all tasks from target column
    const targetColumnTasks = await TasksModel.findAll({ where: { projectColumnId: targetColumnId } }).then((tasks) =>
      tasks.map((task) => task.toJSON()).sort((a, b) => a.order - b.order)
    );

    // 5. get all tasks from source column
    const sourceColumnTasks = await TasksModel.findAll({
      where: { projectColumnId: movedTask.projectColumnId },
    }).then((tasks) => tasks.map((task) => task.toJSON()).sort((a, b) => a.order - b.order));

    // 6. move task - if...
    if (isColumnChange) {
      // ...column has changed
      //  insert moved task to target column in target index
      targetColumnTasks.splice(targetIndex, 0, movedTask);
      //  remove moved task from source column
      sourceColumnTasks.splice(
        sourceColumnTasks.findIndex((task) => task.id === movedTask.id),
        1
      );
    } else {
      // ..column has not changed - so order changed, remove moved task from target column and insert it to target index
      const elementIndex = sourceColumnTasks.findIndex((task) => task.id === movedTask.id);
      sourceColumnTasks.splice(elementIndex, 1);
      sourceColumnTasks.splice(targetIndex, 0, movedTask);
    }

    // 7. update orders of all tasks in target column in function scope
    const updatedTasksInTargetColumn = isColumnChange
      ? targetColumnTasks.map((task, index) => {
          const data = {
            ...task,
            order: index + 1,
          };
          if (task.id === movedTask.id) {
            data.projectColumnId = targetColumnId;
          }
          return data;
        })
      : [];

    // 8. update orders of all tasks in source column in function scope
    const updatedTasksInSourceColumn = sourceColumnTasks.map((task, index) => {
      return {
        ...task,
        order: index + 1,
      };
    });

    // 9. update all tasks orders in source column in database
    updatedTasksInSourceColumn.map(async (task) => {
      return await TasksModel.update(
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

    // 10. update all tasks orders in target column in database
    updatedTasksInTargetColumn.map(async (task) => {
      return await TasksModel.update(
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

    // 11. update task column in database if column has changed
    if (isColumnChange) {
      await TasksModel.update(
        {
          projectColumnId: targetColumnId,
        },
        {
          where: {
            id: movedTask.id,
          },
        }
      );
    }

    // 12. send websocket message with all updated tasks
    [...updatedTasksInTargetColumn, ...updatedTasksInSourceColumn].forEach(async (task) => {
      const taskResponse = await getTaskResponse(task);
      const payload = {
        data: taskResponse,
        itemType: 'task',
        messageType: 'update',
        channel: 'TasksIndexChannel',
        channelParams: { projectId: task.projectId },
        receiversIds: permittedUsers,
      };
      sendWebSocketMessage(payload);
    });

    return res.status(StatusCodes.OK).send();
  } catch (err) {
    errorHandler(err, res);
  }
}
