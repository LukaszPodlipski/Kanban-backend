import { DataTypes, Model } from 'sequelize';
import sequelize from '../index';
import { ITask } from 'database/types';

import UserModel from './users';
import ProjectsModel from './projects';

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
    references: {
      model: 'project_columns',
      key: 'id',
    },
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  identifier: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

UserModel.hasMany(TasksModel, { foreignKey: 'createdById', as: 'tasksCreatedBy' });
TasksModel.belongsTo(UserModel, { foreignKey: 'createdById', as: 'createdBy' });

UserModel.hasMany(TasksModel, { foreignKey: 'assigneeId', as: 'tasksAssignedTo' });
TasksModel.belongsTo(UserModel, { foreignKey: 'assigneeId', as: 'assignee' });

ProjectsModel.hasMany(TasksModel, { foreignKey: 'projectId' });
TasksModel.belongsTo(ProjectsModel, { foreignKey: 'projectId' });
export default TasksModel;
