import { DataTypes, Model } from 'sequelize';
import sequelize from '../index';
import { IProjectUser } from 'database/types';

interface ProjectUserModel extends Model<IProjectUser>, IProjectUser {}

const ProjectUsersModel = sequelize.define<ProjectUserModel>('project_users', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
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
  role: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

export default ProjectUsersModel;
