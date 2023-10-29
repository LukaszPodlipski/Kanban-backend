import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { IAuthenticatedRequestWithQuery, IProjectColumn } from '../database/types';
import { errorHandler, authenticateProjectUser } from './utils';
import {
  specificItemParamsSchema,
  getProjectResourceParamsSchema,
  createColumnBodySchema,
  updateColumnsBodySchema,
} from './validationSchemas';

import ProjectsModel from '../database/models/projects';
import TasksModel from '../database/models/tasks';
import TaskLogsModel from '../database/models/taskLogs';
import ProjectColumnsModel from '../database/models/projectColumns';

/* -------------------------------- GET PROJECT COLUMNS --------------------------------- */
export async function getProjectColumns(req: IAuthenticatedRequestWithQuery<{ projectId: string }>, res: Response) {
  try {
    await getProjectResourceParamsSchema.validate(req.query);
    await authenticateProjectUser(req);

    const { projectId } = req.query || {};

    const project = await ProjectsModel.findByPk(projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const columns = await ProjectColumnsModel.findAll({ where: { projectId } });

    return res.json(columns);
  } catch (err) {
    errorHandler(err, res);
  }
}

/* -------------------------------- CREATE COLUMN --------------------------------- */
export async function createColumn(req: IAuthenticatedRequestWithQuery<{ projectId: string }>, res: Response) {
  try {
    await specificItemParamsSchema.validate(req.query);
    await createColumnBodySchema.validate(req.body);
    await authenticateProjectUser(req);

    const { projectId } = req.query || {};

    const { name } = req.body;

    const columns = await ProjectColumnsModel.findAll({ where: { projectId } });

    const order = columns.length + 1;

    const column = await ProjectColumnsModel.create({
      name,
      projectId: Number(projectId),
      order,
    });

    return res.status(StatusCodes.CREATED).json(column);
  } catch (err) {
    errorHandler(err, res);
  }
}

/* -------------------------------- UPDATE COLUMNS --------------------------------- */

export async function updateColumns(req: IAuthenticatedRequestWithQuery<{ projectId: string }>, res: Response) {
  try {
    await updateColumnsBodySchema.validate(req.body.columns);
    await authenticateProjectUser(req);

    const { projectId } = req.body || {};

    const columns = req.body.columns;

    const project = await ProjectsModel.findByPk(projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    await Promise.all(
      columns.map(async (column: IProjectColumn & { toDelete: boolean }) => {
        const { id, order, name, description, color, type, toDelete } = column;

        const columnToUpdate = await ProjectColumnsModel.findByPk(id);

        if (!columnToUpdate) {
          res.status(404).json({ error: 'Column not found' });
          return;
        }

        if (toDelete) {
          const tasksToUpdate = await TasksModel.findAll({ where: { projectColumnId: id } });
          await Promise.all(
            tasksToUpdate.map(async (taskInstance) => {
              await taskInstance.update({ projectColumnId: null });
              const logData = {
                text: 'Moved task to backlog due to column deletion',
                taskId: taskInstance.id,
                userId: Number(req.user.id),
              };
              await TaskLogsModel.create(logData);
            })
          );
          await columnToUpdate.destroy();
          return;
        }

        await columnToUpdate.update({ order, name, description, color, type });
      })
    );

    return res.status(StatusCodes.OK).send();
  } catch (err) {
    errorHandler(err, res);
  }
}
