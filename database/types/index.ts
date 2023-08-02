import { Request } from 'express';
import { Model } from 'sequelize';
import { ParsedQs } from 'qs';

/* ------------------------------ DATA BASE ---------------------------- */
interface IDatabaseColumn {
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserModel extends Model<IUser>, IUser {}

/* -------------------------------- USER ------------------------------- */
export interface IUser extends IDatabaseColumn {
  id: number;
  name: string;
  surname: string;
  email: string;
  password: string;
  avatarUrl?: string;
}

export class User implements IUser {
  id: number;
  name: string;
  surname: string;
  email: string;
  password: string;
  avatarUrl: string;

  constructor(data: IUser) {
    this.id = data.id;
    this.name = data.name;
    this.surname = data.surname;
    this.email = data.email;
    this.password = data.password;
    this.avatarUrl = data.avatarUrl || '';
  }
}

export interface ISimplifiedUser {
  id: number;
  name?: string;
  surname?: string;
  fullName?: string;
  avatarUrl?: string;
}

export class SimplifiedUser implements ISimplifiedUser {
  id: number;
  name?: string;
  surname?: string;
  fullName: string;
  avatarUrl?: string;

  constructor(data: IUser) {
    this.id = data.id;
    this.fullName = `${data.name} ${data.surname}`;
    this.avatarUrl = data.avatarUrl || '';
  }
}

export type IUserResponse = Omit<IUser, keyof IDatabaseColumn | 'password'>;

export class UserResponse implements IUserResponse {
  id: number;
  name: string;
  surname: string;
  email: string;
  avatarUrl: string;

  constructor(data: IUser) {
    this.id = data.id;
    this.name = data.name;
    this.surname = data.surname;
    this.email = data.email;
    this.avatarUrl = data.avatarUrl || '';
  }
}

/* -------------------------------- PROJECT ------------------------------- */
export interface IProject extends IDatabaseColumn {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  prefix: string;
}

export class Project implements IProject {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  prefix: string;

  constructor(data: IProject) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.ownerId = data.ownerId;
    this.prefix = data.prefix;
  }
}

export class SimplifiedProject implements Pick<IProject, 'id' | 'name'> {
  id: number;
  name: string;

  constructor(data: IProject) {
    this.id = data.id;
    this.name = data.name;
  }
}

export interface IProjectDataResponse extends Omit<IProject, keyof IDatabaseColumn> {
  userId?: number;
  members?: ISimplifiedUser[];
}

export class ProjectDataResponse implements IProjectDataResponse {
  id: number;
  name: string;
  description?: string;
  prefix: string;
  ownerId: number;
  isOwner: boolean;

  constructor(data: IProjectDataResponse) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.prefix = data.prefix;
    this.isOwner = data?.ownerId === data?.userId || false;
  }
}

/* -------------------------------- PROJECT USER ------------------------------- */
export interface IProjectUser extends IDatabaseColumn {
  id: number;
  userId: number;
  projectId: number;
}

export class ProjectUser implements IProjectUser {
  id: number;
  userId: number;
  projectId: number;

  constructor(data: IProjectUser) {
    this.id = data.id;
    this.userId = data.userId;
    this.projectId = data.projectId;
  }
}

/* -------------------------------- PROJECT COLUMN ------------------------------- */
export interface IProjectColumn extends IDatabaseColumn {
  id: number;
  name: string;
  projectId: number;
  order: number;
  color: string;
}

export class ProjectColumn implements IProjectColumn {
  id: number;
  name: string;
  projectId: number;
  order: number;
  color: string;

  constructor(data: IProjectColumn) {
    this.id = data.id || null;
    this.name = data.name || null;
    this.projectId = data.projectId || null;
    this.order = data.order || null;
    this.color = data.color || null;
  }
}

export interface IProjectColumnResponse extends Pick<IProjectColumn, 'id' | 'name' | 'order' | 'color'> {
  tasks?: ITaskResponse[];
}

export class ProjectColumnResponse implements IProjectColumnResponse {
  id: number;
  name: string;
  color: string;
  order: number;

  constructor(data: IProjectColumnResponse) {
    this.id = data.id || null;
    this.name = data.name || null;
    this.color = data.color || null;
    this.order = data.order || null;
  }
}

/* -------------------------------- TASK ------------------------------- */
export interface ITask extends IDatabaseColumn {
  id: number;
  name: string;
  description: string;
  createdById: number;
  assigneeId: number;
  projectId: number;
  projectColumnId: number;
  order: number;
  identifier: string;
  relationMode: string;
  relationId: number;
}

export class Task implements ITask {
  id: number;
  name: string;
  description: string;
  createdById: number;
  assigneeId: number;
  projectId: number;
  projectColumnId: number;
  order: number;
  identifier: string;
  relationMode: string;
  relationId: number;

  constructor(data: ITask) {
    this.id = data.id || null;
    this.name = data.name || null;
    this.description = data.description || null;
    this.createdById = data.createdById || null;
    this.assigneeId = data.assigneeId || null;
    this.projectId = data.projectId || null;
    this.projectColumnId = data.projectColumnId || null;
    this.order = data.order || null;
    this.identifier = data.identifier || null;
    this.relationMode = data.relationMode || null;
    this.relationId = data.relationId || null;
  }
}

export interface ITaskResponse extends Omit<ITask, 'projectId' | 'createdById' | 'assigneeId'> {
  createdBy: ISimplifiedUser;
  assignee: ISimplifiedUser;
}

export class TaskResponse implements ITaskResponse {
  id: number;
  name: string;
  description: string;
  createdBy: ISimplifiedUser;
  assignee: ISimplifiedUser;
  projectColumnId: number;
  order: number;
  identifier: string;
  relationMode: string;
  relationId: number;

  constructor(data: ITaskResponse) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.description = data.description || '';
    this.projectColumnId = data.projectColumnId || null;
    this.order = data.order || 0;
    this.createdBy = {
      id: data.createdBy?.id || null,
      fullName: `${data.createdBy.name} ${data.createdBy.surname}`,
      avatarUrl: data.createdBy.avatarUrl || null,
    };
    this.assignee = data.assignee?.id
      ? {
          id: data.assignee.id || null,
          fullName: `${data.assignee.name} ${data.assignee.surname}`,
          avatarUrl: data.assignee.avatarUrl || null,
        }
      : null;
    this.identifier = data.identifier || null;
    this.relationMode = data.relationMode || null;
    this.relationId = data.relationId || null;
  }
}

export class SimplifiedTaskResponse
  implements
    Pick<ITaskResponse, 'id' | 'name' | 'identifier' | 'description' | 'assignee' | 'projectColumnId' | 'order' | 'identifier'>
{
  id: number;
  name: string;
  identifier: string;
  description: string;
  assignee: ISimplifiedUser;
  projectColumnId: number;
  order: number;

  constructor(data: ITaskResponse) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.identifier = data.identifier || null;
    this.description = data.description || '';
    this.projectColumnId = data.projectColumnId || null;
    this.order = data.order || 0;
    this.assignee = data.assignee?.id
      ? {
          id: data.assignee.id || null,
          fullName: `${data.assignee.name} ${data.assignee.surname}`,
          avatarUrl: data.assignee.avatarUrl || null,
        }
      : null;
  }
}

export interface iTasksFilters {
  assigneeIds?: string[];
  query?: string;
  [key: string]: string | string[] | undefined;
}

/* -------------------------------- REQUEST & PAYLOADS ------------------------------- */

/* --- URL PARAMS ---*/
export interface ISpecificItemParams {
  id: number;
}

/* --- BODY ---*/
export interface ILoginBodyPayload {
  email: string;
  password: string;
}

/* --- REQUEST ---*/
export interface IUnauthenticatedRequest<T> extends Request {
  body: T;
}

export interface IAuthenticatedRequest extends Request {
  user?: IUser;
}

export interface IAuthenticatedRequestWithBody<T> extends IAuthenticatedRequest {
  body: T;
}

export interface IAuthenticatedRequestWithQuery<T extends ParsedQs = ParsedQs> extends IAuthenticatedRequest {
  query: T;
}
