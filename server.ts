import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { CorsOptions } from 'cors';
import limit from 'express-rate-limit';
import bodyParser from 'body-parser';

import { startWebsocketServer } from './websocket';

import sequelize from './database';
import { seedDatabase, dropDatabase } from './database/seed';

import authRouter from './routes/authRouter';
import projectsRouter from './routes/projectsRouter';
import tasksRouter from './routes/tasksRouter';
import columnsRouter from './routes/columnsRouter';

export type TServerConfig = {
  port: number;
  corsOptions: CorsOptions;
  limiter: {
    time: number;
    max: number;
  };
};

type DatabaseConfig = { dropDb: boolean; seedDb: boolean };

const app: Application = express();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _server: any = null;

const startServer = async ({ port, corsOptions, limiter }: TServerConfig, { dropDb, seedDb }: DatabaseConfig) => {
  global.isTest = process.env.NODE_ENV === 'test';
  // Security
  app.use(helmet());
  app.use(cors(corsOptions));
  app.disable('x-powered-by');
  app.use(limit({ windowMs: limiter.time, max: limiter.max }));

  // App configuration
  app.use(bodyParser.json()); // For parsing JSON data
  app.use(bodyParser.urlencoded({ extended: true })); // For parsing URL-encoded data

  // Routes
  app.use('/api/login', authRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/columns', columnsRouter);

  // Start the server
  await new Promise<void>((resolve, reject) => {
    _server = app
      .listen(port, async () => {
        if (!global.isTest) console.log('[Server] Kanbanana app listening on port 3000!');
        if (dropDb) await dropDatabase();
        await sequelize.sync();
        if (seedDb) await seedDatabase();
        resolve();
      })
      .on('error', (error: Error) => {
        reject(error);
      });

    startWebsocketServer();
  });
};

const stopServer = async () => {
  await _server.close();
  if (!global.isTest) console.log('[Server] Kanbanana app stopped!');
};

export { startServer, stopServer, app };
