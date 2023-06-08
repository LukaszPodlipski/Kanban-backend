import { startServer } from './server';
import { config } from './config';

const databaseConfig = {
  dropDb: process.argv.includes('--drop'),
  seedDb: process.argv.includes('--seed'),
};

startServer(config.server, databaseConfig);
