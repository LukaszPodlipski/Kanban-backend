import { Request } from 'express';
import { Model } from 'sequelize';
import { ParsedQs } from 'qs';

/* ------------------------------ DATA BASE ---------------------------- */
export interface IDatabaseColumn {
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
  fullName: string;
  role: roleType;

  constructor(data: IUser) {
    this.id = data.id;
    this.name = data.name;
    this.surname = data.surname;
    this.fullName = `${data.name} ${data.surname}`;
    this.email = data.email;
    this.avatarUrl = data.avatarUrl || '';
  }
}
/* -------------------------------- MEMBERS ------------------------------- */
export interface IMember extends IUserResponse {
  role: roleType;
  createdAt?: string;
}

export class Member implements IMember {
  id: number;
  name: string;
  surname: string;
  email: string;
  avatarUrl: string;
  fullName: string;
  role: roleType;
  createdAt?: string;
  memberId: number;

  constructor(data: IMember) {
    this.id = data.id;
    this.name = data.name;
    this.surname = data.surname;
    this.fullName = `${data.name} ${data.surname}`;
    this.email = data.email;
    this.avatarUrl = data.avatarUrl || '';
    this.role = data.role;
    this.createdAt = data.createdAt?.toString();
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
    this.name = data.name || '';
    this.description = data.description || '';
    this.ownerId = data.ownerId || null;
    this.prefix = data.prefix || '';
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
  role: roleType;
}

export class ProjectDataResponse implements IProjectDataResponse {
  id: number;
  name: string;
  description?: string;
  prefix: string;
  ownerId: number;
  role: roleType;

  constructor(data: IProjectDataResponse) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.prefix = data.prefix;
    this.role = data.role;
  }
}

/* -------------------------------- PROJECT USER ------------------------------- */

type roleType = 'Owner' | 'Maintainer' | 'Editor' | 'Viewer';
export interface IProjectUser extends IDatabaseColumn {
  id: number;
  userId: number;
  projectId: number;
  role: roleType;
}

export class ProjectUser implements IProjectUser {
  id: number;
  userId: number;
  projectId: number;
  role: roleType;

  constructor(data: IProjectUser) {
    this.id = data.id;
    this.userId = data.userId;
    this.projectId = data.projectId;
    this.role = data.role;
  }
}

/* -------------------------------- PROJECT COLUMN ------------------------------- */
type columnsTypesType = 'start' | 'end' | null;
export interface IProjectColumn extends IDatabaseColumn {
  id: number;
  name: string;
  projectId: number;
  order: number;
  color: string;
  type: columnsTypesType;
  description?: string;
}

export class ProjectColumn implements IProjectColumn {
  id: number;
  name: string;
  projectId: number;
  order: number;
  color: string;
  type: columnsTypesType;
  description?: string;

  constructor(data: IProjectColumn) {
    this.id = data.id || null;
    this.name = data.name || null;
    this.projectId = data.projectId || null;
    this.order = data.order || null;
    this.color = data.color || null;
    this.type = data.type || null;
    this.description = data.description || null;
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

export interface ITaskLog extends IDatabaseColumn {
  id: number;
  taskId: number;
  userId: number;
  text: string;
}

export class TaskLog implements ITaskLog {
  id: number;
  taskId: number;
  userId: number;
  date: Date;
  text: string;
  createdAt: Date;

  constructor(data: ITaskLog) {
    this.id = data.id || null;
    this.taskId = data.taskId || null;
    this.userId = data.userId || null;
    this.text = data.text || null;
    this.createdAt = data.createdAt || null;
  }
}

export interface ITaskComment extends IDatabaseColumn {
  id: number;
  taskId: number;
  userId: number;
  content: string;
}

export class TaskComment implements ITaskComment {
  id: number;
  taskId: number;
  userId: number;
  content: string;

  constructor(data: ITaskComment) {
    this.id = data.id || null;
    this.taskId = data.taskId || null;
    this.userId = data.userId || null;
    this.content = data.content || null;
  }
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
  comments: ITaskComment[];
  createdAt: Date;

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
    this.createdAt = data.createdAt || null;
  }
}

export interface ITaskResponse extends Omit<ITask, 'projectId' | 'createdById' | 'assigneeId'> {
  createdBy: ISimplifiedUser;
  assignee: ISimplifiedUser;
  comments: ITaskComment[];
  history: ITaskLog[];
  relatedTask?: (SimplifiedTaskResponse & { relationMode: string }) | null;
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
  comments: ITaskComment[];
  history: ITaskLog[];
  createdAt: Date;
  relatedTask: (SimplifiedTaskResponse & { relationMode: string }) | null;

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
    this.relationId = data.relationId || null;
    this.comments = data.comments || [];
    this.history = data.history || [];
    this.createdAt = data.createdAt || null;
    this.relatedTask = { ...data.relatedTask, relationMode: data.relationMode } || null;
  }
}

export class SimplifiedTaskResponse
  implements
    Pick<
      ITaskResponse,
      'id' | 'name' | 'identifier' | 'description' | 'assignee' | 'projectColumnId' | 'order' | 'identifier' | 'createdAt'
    >
{
  id: number;
  name: string;
  identifier: string;
  description: string;
  assignee: ISimplifiedUser;
  projectColumnId: number;
  order: number;
  createdAt: Date;

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
    this.createdAt = data.createdAt;
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
