import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';
import { Response } from 'express';

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

export const compareObjects = (objectA, objectB) => {
  const keysA = Object.keys(objectA) || [];
  const keysB = Object.keys(objectB) || [];

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (!keysB.includes(key) || objectA[key] !== objectB[key]) {
      return false;
    }
  }

  return true;
};

export const errorHandler = (err: Error, res: Response) => {
  if (!global.isTest) console.log(err);

  if (err?.name === 'ValidationError') {
    res.status(StatusCodes.BAD_REQUEST).json({ error: err.message });
  } else {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};
