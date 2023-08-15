import { DataTypes, Model } from 'sequelize';
import sequelize from '../index';
import { ITaskLog } from 'database/types';

interface TaskLogsModel extends Model<ITaskLog>, ITaskLog {}

const TaskLogsModel = sequelize.define<TaskLogsModel>('task_logs', {
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
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

export default TaskLogsModel;
