import { DataTypes, Model } from 'sequelize';
import sequelize from '../index';
import { ITaskComment } from 'database/types';

interface TaskCommentModel extends Model<ITaskComment>, ITaskComment {}

const TaskCommentModel = sequelize.define<TaskCommentModel>('task_comments', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  taskId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tasks',
      key: 'id',
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

export default TaskCommentModel;
