import { DataTypes, Model } from 'sequelize';
import sequelize from '../index';
import { ITask } from 'database/types';

import UserModel from './users';
import ProjectsModel from './projects';
import ProjectColumnModel from './projectColumns';

interface TaskModel extends Model<ITask>, ITask {}

const TasksModel = sequelize.define<TaskModel>('tasks', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  assigneeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id',
    },
  },
  projectColumnId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projectColumns',
      key: 'id',
    },
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

TasksModel.belongsTo(UserModel, { foreignKey: 'createdById', as: 'createdBy' });
UserModel.hasMany(TasksModel, { foreignKey: 'createdById', as: 'tasksCreatedBy' });
TasksModel.belongsTo(UserModel, { foreignKey: 'assigneeId', as: 'assignee' });
UserModel.hasMany(TasksModel, { foreignKey: 'assigneeId', as: 'tasksAssignedTo' });
TasksModel.belongsTo(ProjectsModel, { foreignKey: 'projectId' });
ProjectsModel.hasMany(TasksModel, { foreignKey: 'projectId' });
TasksModel.belongsTo(ProjectColumnModel, { foreignKey: 'projectColumnId' });
ProjectColumnModel.hasMany(TasksModel, { foreignKey: 'projectColumnId' });

export default TasksModel;
