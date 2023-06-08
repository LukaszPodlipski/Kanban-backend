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

export interface ISimplifiedUser extends Omit<IUser, 'password' | 'email'> {
  fullName: string;
}

export class SimplifiedUser implements ISimplifiedUser {
  id: number;
  name: string;
  surname: string;
  fullName: string;

  constructor(data: IUser) {
    this.id = data.id;
    this.fullName = `${data.name} ${data.surname}`;
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

export interface IProjectResponse extends Omit<IProject, 'createdAt' | 'updatedAt'> {
  userId?: number;
  columns: IProjectColumnResponse[];
}

export class ProjectResponse implements IProjectResponse {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  isOwner: boolean;
  columns: IProjectColumnResponse[];

  constructor(data: IProjectResponse) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.isOwner = data?.ownerId === data?.userId || false;
    this.columns = data.columns;
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
}

export class ProjectColumn implements IProjectColumn {
  id: number;
  name: string;
  projectId: number;
  order: number;

  constructor(data: IProjectColumn) {
    this.id = data.id;
    this.name = data.name;
    this.projectId = data.projectId;
    this.order = data.order;
  }
}

export interface IProjectColumnResponse extends Pick<IProjectColumn, 'id' | 'name'> {
  tasks: ITaskResponse[];
}

export class ProjectColumnResponse implements IProjectColumnResponse {
  id: number;
  name: string;
  tasks: ITaskResponse[];

  constructor(data: IProjectColumnResponse) {
    this.id = data.id;
    this.name = data.name;
    this.tasks = data.tasks;
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
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.createdById = data.createdById;
    this.assigneeId = data.assigneeId;
    this.projectId = data.projectId;
    this.projectColumnId = data.projectColumnId;
    this.order = data.order;
  }
}

export type ITaskResponse = Omit<ITask, 'projectId' | 'createdAt' | 'updatedAt' | 'order'>;

export class TaskResponse implements ITaskResponse {
  id: number;
  name: string;
  description: string;
  createdById: number;
  assigneeId: number;
  projectColumnId: number;

  constructor(data: ITaskResponse) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.createdById = data.createdById;
    this.assigneeId = data.assigneeId;
    this.projectColumnId = data.projectColumnId;
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
export interface IUnAuthenticatedRequest<T> extends Request {
  body: T;
}

export interface IAuthenticatedRequest extends Request {
  user?: IUser;
}

export interface IAuthenticatedRequestWithBody<T> extends IAuthenticatedRequest {
  body: T;
}
