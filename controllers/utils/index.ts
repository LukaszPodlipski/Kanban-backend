import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';
import { Response } from 'express';
import ProjectsModel from '../../database/models/projects';
import ProjectUsers from '../../database/models/projectUsers';

export const hashPassword = (password: string) => {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        reject(err);
        return;
      }
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(hash);
      });
    });
  });
};

export const verifyPassword = (password: string, hash: string) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

export const authenticateProjectUser = (req) => {
  return new Promise<void>(async (resolve, reject) => {
    const userId = req?.user?.id || null;
    const projectId = req?.params?.projectId || req?.query?.projectId || req?.body?.projectId || req?.params?.id || null;

    const projectUser = await ProjectUsers.findOne({ where: { userId, projectId } });

    if (!projectUser) {
      reject({ name: 'PermissionError', message: 'User is not the member of this project' });
      return;
    }

    const project = await ProjectsModel.findByPk(projectId);

    if (!project) {
      reject({ name: 'NotFoundError', message: 'Project not found', status: StatusCodes.NOT_FOUND });
      return;
    }
    resolve();
  });
};

export const errorHandler = (err: Error, res: Response) => {
  if (!global.isTest) console.log(err);

  if (err?.name === 'ValidationError') {
    res.status(StatusCodes.BAD_REQUEST).json({ error: err.message });
    return;
  } else if (err.name === 'PermissionError') {
    res.status(StatusCodes.FORBIDDEN).json({ error: err.message });
    return;
  } else if (err.name === 'NotFoundError') {
    res.status(StatusCodes.NOT_FOUND).json({ error: err.message });
  } else {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    return;
  }
};

export const isProjectAdmin = (role) => {
  return ['Owner', 'Maintainer'].includes(role);
};
