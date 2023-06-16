import { Request } from 'express';

/* ------------------------------ DATA BASE ---------------------------- */
interface IDatabaseColumn {
  createdAt?: Date;
  updatedAt?: Date;
}

/* -------------------------------- USER ------------------------------- */
export interface IUser extends IDatabaseColumn {
  id: number;
  name: string;
  surname: string;
  email: string;
  password: string;
}

export class User implements IUser {
  id: number;
  name: string;
  surname: string;
  email: string;
  password: string;

  constructor(data: IUser) {
    this.id = data.id;
    this.name = data.name;
    this.surname = data.surname;
    this.email = data.email;
    this.password = data.password;
  }
}

export interface ISimplifiedUser {
  id: number;
  name?: string;
  surname?: string;
  fullName?: string;
}

export class SimplifiedUser implements ISimplifiedUser {
  id: number;
  name?: string;
  surname?: string;
  fullName: string;

  constructor(data: IUser) {
    this.id = data.id;
    this.fullName = `${data.name} ${data.surname}`;
  }
}

export type IUserResponse = Omit<IUser, keyof IDatabaseColumn | 'password'>;

export class UserResponse implements IUserResponse {
  id: number;
  name: string;
  surname: string;
  email: string;

  constructor(data: IUser) {
    this.id = data.id;
    this.name = data.name;
    this.surname = data.surname;
    this.email = data.email;
  }
}

/* -------------------------------- PROJECT ------------------------------- */
export interface IProject extends IDatabaseColumn {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
}

export class Project implements IProject {
  id: number;
  name: string;
  description?: string;
  ownerId: number;

  constructor(data: IProject) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.ownerId = data.ownerId;
  }
}

export class ProjectListItem implements Pick<IProject, 'id' | 'name'> {
  id: number;
  name: string;

  constructor(data: IProject) {
    this.id = data.id;
    this.name = data.name;
  }
}

export interface IProjectResponse extends Omit<IProject, keyof IDatabaseColumn> {
  userId?: number;
  columns?: IProjectColumnResponse[];
  tasks?: ITaskResponse[];
}

export class ProjectResponse implements IProjectResponse {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  isOwner: boolean;
  columns: IProjectColumnResponse[];
  tasks: ITaskResponse[];

  constructor(data: IProjectResponse) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.isOwner = data?.ownerId === data?.userId || false;
    this.columns = data.columns || [];
    this.tasks = data.tasks || [];
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
  tasks?: ITask[];
}

export class ProjectColumn implements IProjectColumn {
  id: number;
  name: string;
  projectId: number;
  order: number;

  constructor(data: IProjectColumn) {
    this.id = data.id || null;
    this.name = data.name || null;
    this.projectId = data.projectId || null;
    this.order = data.order || null;
  }
}

export interface IProjectColumnResponse extends Pick<IProjectColumn, 'id' | 'name'> {
  tasks?: ITaskResponse[];
}

export class ProjectColumnResponse implements IProjectColumnResponse {
  id: number;
  name: string;

  constructor(data: IProjectColumnResponse) {
    this.id = data.id || null;
    this.name = data.name || null;
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

  constructor(data: ITask) {
    this.id = data.id || null;
    this.name = data.name || null;
    this.description = data.description || null;
    this.createdById = data.createdById || null;
    this.assigneeId = data.assigneeId || null;
    this.projectId = data.projectId || null;
    this.projectColumnId = data.projectColumnId || null;
    this.order = data.order || null;
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

  constructor(data: ITaskResponse) {
    this.id = data.id || null;
    this.name = data.name || null;
    this.description = data.description || null;
    this.order = data.order || 0;
    this.createdBy = {
      id: data.createdBy.id || null,
      fullName: `${data.createdBy.name} ${data.createdBy.surname}`,
    };
    this.assignee = {
      id: data.assignee.id || null,
      fullName: `${data.assignee.name} ${data.assignee.surname}`,
    };
    this.projectColumnId = data.projectColumnId || null;
  }
}

/* -------------------------------- REQUEST & PAYLOADS ------------------------------- */

/* --- URL PARAMS ---*/
export interface ISpecificProjectParams {
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
