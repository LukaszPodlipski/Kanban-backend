import { DataTypes, Model } from 'sequelize';
import sequelize from '../index';
import { IProject } from 'database/types';
import UsersModel from './users';
import ProjectUsersModel from './projectUsers';
import { IProjectColumnResponse, UserModel } from 'database/types';

interface ProjectModel extends Model<IProject>, IProject {
  projectColumns: IProjectColumnResponse[];
  users: UserModel[];
}

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
  },
});

ProjectsModel.belongsToMany(UsersModel, { through: ProjectUsersModel, foreignKey: 'projectId' });
UsersModel.belongsToMany(ProjectsModel, { through: ProjectUsersModel, foreignKey: 'userId' });
export default ProjectsModel;
