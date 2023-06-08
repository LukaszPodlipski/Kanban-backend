import { DataTypes, Model } from 'sequelize';
import sequelize from '../index';
import { IProject } from 'database/types';
import UsersModel from './users';

interface ProjectModel extends Model<IProject>, IProject {}

const ProjectsModel = sequelize.define<ProjectModel>('projects', {
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
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
});

ProjectsModel.belongsTo(UsersModel, { foreignKey: 'ownerId' });

export default ProjectsModel;
