import { TServerConfig } from './server';

export type TEnv = 'production' | 'test' | 'development';

export type TConfig = {
  env: TEnv;
  server: TServerConfig;
};

const env = (process.env.NODE_ENV || 'production') as TEnv;

const API_PORT = 3000;
const DEVELOPMENT_APP_PORT = 4000;

export const config: TConfig = {
  env,
  server: {
    port: API_PORT,
    corsOptions: env === 'development' ? { origin: `http://127.0.0.1:${DEVELOPMENT_APP_PORT}` } : {},
    limiter: {
      time: 15 * 60 * 1000,
      max: 250,
    },
  },
};
