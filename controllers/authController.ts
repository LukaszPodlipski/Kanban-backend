import jwt from 'jsonwebtoken';
import { verifyPassword, errorHandler } from './utils';

import { StatusCodes } from 'http-status-codes';

import { IUser, ILoginBodyPayload, IUnAuthenticatedRequest } from '../database/types';
import { Response } from 'express';
import { loginSchema } from './validationSchemas';

import UsersModel from '../database/models/users';

const secretKey = process.env.SECRET_KEY;

export const getValidatedUser = async (payload: ILoginBodyPayload): Promise<IUser> => {
  await loginSchema.validate(payload);
  const { email, password } = payload;

  const user = await UsersModel.findOne({ where: { email } });
  if (!user) return null;

  const validPassword = await verifyPassword(password, user.password);
  if (!validPassword) return null;

  return user;
};

export const login = async (req: IUnAuthenticatedRequest<{ email: string; password: string }>, res: Response) => {
  try {
    const user: IUser = await getValidatedUser(req.body);

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, secretKey, { expiresIn: '1h' });

    // Return token as response
    res.json({ token });
  } catch (err) {
    errorHandler(err, res);
  }
};
