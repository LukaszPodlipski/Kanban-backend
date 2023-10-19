import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  IAuthenticatedRequestWithBody,
  IAuthenticatedRequestWithQuery,
  ISpecificItemParams,
  TaskResponse,
  SimplifiedTaskResponse,
  iTasksFilters,
} from '../database/types';
import { errorHandler, authenticateProjectUser } from './utils';

import {
  specificItemParamsSchema,
  getProjectResourceParamsSchema,
  createTaskBodySchema,
  moveTaskBodySchema,
  addTaskCommentBodySchema,
} from './validationSchemas';

import ProjectUsers from '../database/models/projectUsers';
import Users from '../database/models/users';
import TasksModel from '../database/models/tasks';
import TaskCommentModel from '../database/models/taskComments';
import TaskLogsModel from '../database/models/taskLogs';
import ProjectColumnsModel from '../database/models/projectColumns';

import { Op, WhereOptions, Sequelize } from 'sequelize';

import { sendWebSocketMessage } from '../websocket';
import { oppositeRelationTypesMap } from './const/relationTypes';

const getColumnNameById = async (columnId: number) => {
  const column = await ProjectColumnsModel.findByPk(columnId).then((column) => column?.toJSON());
  return column?.name;
};

const getTaskResponse = async (task, simplified: boolean = false) => {
  const createdBy = await Users.findOne({ where: { id: task?.createdById } }).then((user) => user.toJSON());
  const assignee = task?.assigneeId ? await Users.findOne({ where: { id: task?.assigneeId } }) : null;
  const comments = await TaskCommentModel.findAll({ where: { taskId: task?.id } }).then(
    async (comments) =>
      await Promise.all(
        comments.map(async (comment) => {
          const user = await Users.findOne({ where: { id: comment.userId } }).then((user) => user.toJSON());
          return {
            id: comment.id,
            content: comment.content,
            user: {
              id: user.id,
              avatarUrl: user.avatarUrl,
              fullName: `${user.name} ${user.surname}`,
            },
            createdAt: comment.createdAt,
          };
        })
      )
  );
  const history = await TaskLogsModel.findAll({ where: { taskId: task?.id } }).then(
    async (logs) =>
      await Promise.all(
        logs.map(async (log) => {
          const user = await Users.findOne({ where: { id: log.userId } }).then((user) => user.toJSON());
          return {
            id: log.id,
            text: log.text,
            user: {
              id: user.id,
              avatarUrl: user.avatarUrl,
              fullName: `${user.name} ${user.surname}`,
            },
            createdAt: log.createdAt,
          };
        })
      )
  );

  const completeTask = {
    ...task,
    assignee,
    createdBy,
    comments,
    history,
  };

  return simplified ? new SimplifiedTaskResponse(completeTask) : new TaskResponse(completeTask);
};

/* -------------------------------- GET PROJECT TASKS --------------------------------- */
export async function getProjectTasks(
  req: IAuthenticatedRequestWithQuery<{ projectId: string; filters: iTasksFilters }>,
  res: Response
) {
  try {
    await getProjectResourceParamsSchema.validate(req.query);
    await authenticateProjectUser(req);

    const { projectId, filters } = req.query;
    const { assigneeIds, query } = filters || {};

    let condition: WhereOptions = {
      projectId,
    };

    if (assigneeIds?.length) {
      condition = {
        ...condition,
        assigneeId: {
          [Op.in]: assigneeIds,
        },
      };
    }

    if (query) {
      condition = {
        ...condition,
        [Op.or]: [
          Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('description')), {
            [Op.iLike]: `%${query.toLowerCase()}%`,
          }),
          Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('name')), {
            [Op.iLike]: `%${query.toLowerCase()}%`,
          }),
        ],
      };
    }

    const tasks = await TasksModel.findAll({ where: condition });
    const parsedTasks = await Promise.all(tasks.map((task) => getTaskResponse(task.toJSON(), true)));

    return res.json(parsedTasks);
  } catch (err) {
    errorHandler(err, res);
  }
}

/* -------------------------------- GET PROJECT TASK --------------------------------- */

export async function getProjectTask(req: IAuthenticatedRequestWithQuery<{ projectId: string }>, res: Response) {
  try {
    await getProjectResourceParamsSchema.validate(req.query);
    await authenticateProjectUser(req);

    const { id: taskId } = req.params;

    const task = await TasksModel.findByPk(taskId);

    if (!task) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Task not found' });

    if (task.projectId !== Number(req.query.projectId))
      return res.status(StatusCodes.FORBIDDEN).json({ error: 'You are not permitted to access this task' });

    const taskResponse = await getTaskResponse(task.toJSON());

    return res.json(taskResponse);
  } catch (err) {
    errorHandler(err, res);
  }
}

/* -------------------------------- CREATE NEW TASK --------------------------------- */

export async function createTask(
  req: IAuthenticatedRequestWithBody<{
    projectId: number;
    name: string;
    description?: string;
    assigneeId?: number;
    projectColumnId?: number;
    relationMode?: string;
    relationId?: number;
  }>,
  res: Response
) {
  try {
    await createTaskBodySchema.validate(req.body);
    await authenticateProjectUser(req);

    const { name, description, assigneeId, projectColumnId, projectId, relationMode, relationId } = req.body;

    const columnTasks = await TasksModel.findAll({ where: { projectColumnId } });
    const lastTask = await TasksModel.findOne({
      order: [['createdAt', 'DESC']], // Sort by createdAt column in descending order
    });

    const lastIdentifier = lastTask.identifier.split('-');

    const order = columnTasks.length + 1;
    const createdById = req.user.id;

    const taskData = {
      name,
      description,
      createdById,
      assigneeId: assigneeId || null,
      projectId: projectId,
      projectColumnId: projectColumnId || null,
      order,
      identifier: `${lastIdentifier[0]}-${Number(lastIdentifier[1]) + 1}`,
      relationMode: relationMode || null,
      relationId: relationId || null,
    };

    const task = await TasksModel.create(taskData);

    const logData = {
      text: 'Created task',
      taskId: task.id,
      userId: req.user.id,
    };

    await TaskLogsModel.create(logData);

    const taskResponse = await getTaskResponse(task.toJSON(), true);

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

/* -------------------------------- UPDATE TASK --------------------------------- */

export async function updateTask(
  req: IAuthenticatedRequestWithBody<{
    name?: string;
    description?: string;
    assigneeId?: number;
    projectColumnId?: number;
    relationMode?: string;
    relationId?: number;
  }> & { params: ISpecificItemParams },
  res: Response
) {
  try {
    await specificItemParamsSchema.validate(req.params);
    await authenticateProjectUser(req);

    const { name, description, assigneeId, projectColumnId, relationMode, relationId } = req.body;
    const { id: taskId } = req.params;

    const task = await TasksModel.findByPk(taskId).then((task) => task?.toJSON());

    if (!task) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Task not found' });
    }

    const permittedUsers = await ProjectUsers.findAll({ where: { projectId: task.projectId } }).then((users) =>
      users.map((user) => user.userId)
    );

    const data = {
      name: typeof name !== 'undefined' ? name : task.name,
      description: typeof description !== 'undefined' ? description : task.description,
      assigneeId: typeof assigneeId !== 'undefined' ? assigneeId : task.assigneeId,
      projectColumnId: typeof projectColumnId !== 'undefined' ? projectColumnId : task.projectColumnId,
      relationMode: typeof relationMode !== 'undefined' ? relationMode : task.relationMode,
      relationId: typeof relationId !== 'undefined' ? relationId : task.relationId,
    };

    await TasksModel.update(data, { where: { id: taskId } });

    if (typeof relationId !== 'undefined' && typeof relationMode !== 'undefined') {
      const relationData = {
        relationMode: oppositeRelationTypesMap[relationMode] || null,
        relationId: relationId ? taskId : null,
      };
      const relationTask = await TasksModel.findByPk(relationId).then((task) => task?.toJSON());
      await TasksModel.update(relationData, { where: { id: relationTask?.id || task.relationId } });
    }

    const logValuesDictionary = {
      name: 'name',
      description: 'description',
      assigneeId: 'assignee',
      projectColumnId: 'status',
      relationId: 'relation',
      relationMode: '',
    };

    const logData = {
      text: `Updated task ${Object.entries(req.body)
        .filter(([key, value]) => value && key !== 'projectId')
        .map(([key, _]) => logValuesDictionary[key])
        .filter((value) => value)
        .join(', ')}`,
      taskId: task.id,
      userId: req.user.id,
    };

    await TaskLogsModel.create(logData);

    const updatedTask = await TasksModel.findByPk(taskId).then((task) => task?.toJSON());

    const taskResponse = await getTaskResponse(updatedTask);

    const payload = {
      data: taskResponse,
      itemType: 'task',
      messageType: 'update',
      receiversIds: permittedUsers,
    };

    sendWebSocketMessage({ ...payload, channel: 'TasksIndexChannel', channelParams: { projectId: task.projectId } });
    sendWebSocketMessage({
      ...payload,
      channel: 'TaskIndexChannel',
      channelParams: { projectId: task.projectId, taskId: task.id },
    });

    return res.status(StatusCodes.OK).json(updatedTask);
  } catch (err) {
    errorHandler(err, res);
  }
}

/* -------------------------------- MOVE TASK --------------------------------- */
export async function moveTask(
  req: IAuthenticatedRequestWithBody<{
    targetColumnId: number;
    targetIndex: number;
  }> & { params: ISpecificItemParams },
  res: Response
) {
  try {
    await specificItemParamsSchema.validate(req.params);
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

    // 9. create log
    const previousColumnnName = await getColumnNameById(movedTask.projectColumnId);
    const targetColumnName = await getColumnNameById(targetColumnId);

    const logData = {
      text: `Changed task status from ${previousColumnnName} to ${targetColumnName}`,
      taskId: movedTask.id,
      userId: req.user.id,
    };

    await TaskLogsModel.create(logData);

    // 10. update all tasks orders in source column in database
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

    // 11. update all tasks orders in target column in database
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

    // 12. update task column in database if column has changed
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

    // 13. send websocket message with all updated tasks
    [...updatedTasksInTargetColumn, ...updatedTasksInSourceColumn].forEach(async (task) => {
      const taskResponse = await getTaskResponse(task, true);
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

    // 14. send websocket message with updated task
    const taskResponse = await getTaskResponse({ ...movedTask, projectColumnId: targetColumnId });
    const payload = {
      data: taskResponse,
      itemType: 'task',
      messageType: 'update',
      channel: 'TaskIndexChannel',
      channelParams: { projectId: movedTask.projectId, taskId: movedTask.id },
      receiversIds: permittedUsers,
    };
    sendWebSocketMessage(payload);

    return res.status(StatusCodes.OK).send();
  } catch (err) {
    errorHandler(err, res);
  }
}

/* -------------------------------- ADD TASK COMMENT --------------------------------- */

export async function addTaskComment(
  req: IAuthenticatedRequestWithBody<{
    content: string;
  }> & { params: ISpecificItemParams },
  res: Response
) {
  try {
    await specificItemParamsSchema.validate(req.params);
    await addTaskCommentBodySchema.validate(req.body);

    const { content } = req.body;
    const { id: taskId } = req.params;

    const task = await TasksModel.findByPk(taskId).then((task) => task?.toJSON());

    if (!task) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Task not found' });
    }

    const payload = {
      content,
      taskId,
      userId: req.user.id,
    };

    await TaskCommentModel.create(payload);

    const permittedUsers = await ProjectUsers.findAll({ where: { projectId: task.projectId } }).then((users) =>
      users.map((user) => user.userId)
    );

    const taskResponse = await getTaskResponse(task);

    const payloadToSend = {
      data: taskResponse,
      itemType: 'task',
      messageType: 'update',
      channel: 'TaskIndexChannel',
      channelParams: { projectId: task.projectId, taskId: task.id },
      receiversIds: permittedUsers,
    };

    sendWebSocketMessage(payloadToSend);

    return res.status(StatusCodes.OK).send();
  } catch (err) {
    errorHandler(err, res);
  }
}
