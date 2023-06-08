import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

const databaseName = global.isTest ? process.env.DATABASE_NAME_TEST : process.env.DATABASE_NAME;

// create a new sequelize instance with the local postgres database information.
const sequelize = new Sequelize(databaseName, process.env.DATABASE_USERNAME, process.env.DATABASE_PASSWORD, {
  host: 'localhost',
  dialect: 'postgres',
  logging: ['development', 'test'].includes(process.env.NODE_ENV) ? false : true,
});

// test the connection to the database
sequelize
  .authenticate()
  .then(() => {
    if (!global.isTest) console.log('[Database] Connection has been established successfully.');
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  });

export default sequelize;
