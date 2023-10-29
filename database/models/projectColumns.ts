import { DataTypes, Model } from 'sequelize';
import sequelize from '../index';
import { IProjectColumn } from 'database/types';
import ProjectsModel from './projects';
import TasksModel from './tasks';

interface ProjectColumnModel extends Model<IProjectColumn>, IProjectColumn {}

const ProjectColumnsModel = sequelize.define<ProjectColumnModel>('project_columns', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id',
    },
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  color: {
    type: DataTypes.STRING,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

ProjectsModel.hasMany(ProjectColumnsModel, { foreignKey: 'projectId' });
ProjectColumnsModel.belongsTo(ProjectsModel, { foreignKey: 'projectId' });

ProjectColumnsModel.hasMany(TasksModel, { foreignKey: 'projectColumnId' });
TasksModel.belongsTo(ProjectColumnsModel, { foreignKey: 'projectColumnId' });
export default ProjectColumnsModel;
