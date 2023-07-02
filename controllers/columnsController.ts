import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { IAuthenticatedRequestWithBody, IAuthenticatedRequestWithQuery, ISpecificProjectParams } from '../database/types';
import { errorHandler, authenticateProjectUser } from './utils';
import { specificProjectParamsSchema, getProjectResourceParamsSchema, createColumnBodySchema } from './validationSchemas';

import ProjectsModel from '../database/models/projects';
import ProjectColumnsModel from '../database/models/projectColumns';

/* -------------------------------- GET PROJECT COLUMNS --------------------------------- */
export async function getProjectColumns(req: IAuthenticatedRequestWithQuery<{ id: string }>, res: Response) {
  try {
    await getProjectResourceParamsSchema.validate(req.query);
    await authenticateProjectUser(req);

    const { id: projectId } = req.query || {};

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
export async function createColumn(
  req: IAuthenticatedRequestWithBody<{ name: string }> & { params: ISpecificProjectParams },
  res: Response
) {
  try {
    await specificProjectParamsSchema.validate(req.params);
    await createColumnBodySchema.validate(req.body);
    await authenticateProjectUser(req);

    const { id: projectId } = req.params;

    const { name } = req.body;

    const columns = await ProjectColumnsModel.findAll({ where: { projectId } });

    const order = columns.length + 1;

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
