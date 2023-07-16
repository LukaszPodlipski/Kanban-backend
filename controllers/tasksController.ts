import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  IAuthenticatedRequestWithBody,
  IAuthenticatedRequestWithQuery,
  ISpecificProjectParams,
  TaskResponse,
} from '../database/types';
import { errorHandler, authenticateProjectUser } from './utils';

import {
  specificProjectParamsSchema,
  getProjectResourceParamsSchema,
  createTaskBodySchema,
  moveTaskBodySchema,
} from './validationSchemas';

import ProjectUsers from '../database/models/projectUsers';
import Users from '../database/models/users';
import TasksModel from '../database/models/tasks';

import { sendWebSocketMessage } from '../websocket';

const getTaskResponse = async (task) => {
  const createdBy = await Users.findOne({ where: { id: task?.createdById } }).then((user) => user.toJSON());
  const assignee = task?.assigneeId ? await Users.findOne({ where: { id: task?.assigneeId } }) : null;

  const completeTask = {
    ...task,
    assignee,
    createdBy,
  };

  return new TaskResponse(completeTask);
};

/* -------------------------------- GET PROJECT TASKS --------------------------------- */
export async function getProjectTasks(req: IAuthenticatedRequestWithQuery<{ id: string }>, res: Response) {
  try {
    await getProjectResourceParamsSchema.validate(req.query);
    await authenticateProjectUser(req);

    const { id: projectId } = req.query;

    const tasks = await TasksModel.findAll({ where: { projectId } });

    const parsedTasks = await Promise.all(
      tasks.map(async (task) => {
        const createdBy = await Users.findOne({ where: { id: task?.createdById } });
        const assignee = await Users.findOne({ where: { id: task?.assigneeId } });

        return new TaskResponse({ ...task.toJSON(), createdBy, assignee });
      })
    );

    res.json(parsedTasks);
  } catch (err) {
    console.log('err: ', err);
    errorHandler(err, res);
  }
}

/* -------------------------------- CREATE NEW TASK --------------------------------- */

export async function createTask(
  req: IAuthenticatedRequestWithBody<{
    name: string;
    description: string;
    createdById: number;
    assigneeId: number;
    projectColumnId: number;
  }> & { params: ISpecificProjectParams },
  res: Response
) {
  try {
    await specificProjectParamsSchema.validate(req.params);
    await createTaskBodySchema.validate(req.body);
    await authenticateProjectUser(req);

    const { id: projectId } = req.params;

    const { name, description, assigneeId, projectColumnId } = req.body;

    const columnTasks = await TasksModel.findAll({ where: { projectColumnId } });
    const lastTask = await TasksModel.findOne({
      order: [['createdAt', 'DESC']], // Sort by createdAt column in descending order
    });

    const lastIdentifier = lastTask.identifier.split('-');

    const order = columnTasks.length + 1;
    const createdById = req.user.id;

    const data = {
      name,
      description,
      createdById,
      assigneeId: assigneeId || null,
      projectId: Number(projectId),
      projectColumnId: projectColumnId || null,
      order,
      identifier: `${lastIdentifier[0]}-${Number(lastIdentifier[1]) + 1}`,
    };

    const task = await TasksModel.create(data);

    const taskResponse = await getTaskResponse(task.toJSON());

    const permittedUsers = await ProjectUsers.findAll({ where: { projectId } }).then((users) => users.map((user) => user.userId));

    const payload = {
      data: taskResponse,
      itemType: 'task',
      messageType: 'create',
      channel: 'TasksIndexChannel',
      channelParams: { projectId: task.projectId },
      receiversIds: permittedUsers,
    };

    sendWebSocketMessage(payload);

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
