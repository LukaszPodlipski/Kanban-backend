import { DataTypes, Model } from 'sequelize';
import sequelize from '../index';
import { IProjectColumn } from 'database/types';
import ProjectsModel from './projects';

interface ProjectColumnModel extends Model<IProjectColumn>, IProjectColumn {}

const ProjectColumnsModel = sequelize.define<ProjectColumnModel>('projectColumns', {
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
});

ProjectColumnsModel.belongsTo(ProjectsModel, { foreignKey: 'projectId' });
ProjectsModel.hasMany(ProjectColumnsModel, { foreignKey: 'projectId' });

export default ProjectColumnsModel;
