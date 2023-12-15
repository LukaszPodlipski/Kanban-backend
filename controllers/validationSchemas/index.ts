import * as yup from 'yup';

export const loginSchema = yup.object().shape({
  email: yup.string().email().required('Email is required'),
  password: yup.string().required('Password is required'),
});

export const specificItemParamsSchema = yup.object().shape({
  id: yup.number().required('Item id is required').moreThan(0),
});

export const createColumnBodySchema = yup.object().shape({
  name: yup.string().required('Name is required'),
});

export const createTaskBodySchema = yup.object().shape({
  projectId: yup.number().required('Project id is required').moreThan(0),
  description: yup.string(),
  name: yup.string().required('Name is required'),
  assigneeId: yup.number().moreThan(0).nullable(),
  projectColumnId: yup.number().moreThan(0).nullable(),
});

export const moveTaskBodySchema = yup.object().shape({
  targetColumnId: yup.number().required('To column id is required').moreThan(0),
  targetIndex: yup.string().required('To index is required'),
});

export const getProjectResourceParamsSchema = yup.object().shape({
  projectId: yup.string().required('Project id is required'),
});

export const addTaskCommentBodySchema = yup.object().shape({
  content: yup.string().required('Content is required'),
});

export const updateMemberBodySchema = yup.object().shape({
  role: yup.string(),
});

export const inviteMembersParamsSchema = yup.object().shape({
  projectId: yup.string().required('Project id is required'),
  users: yup
    .array()
    .of(
      yup.object().shape({
        id: yup.number().required(),
        role: yup.string().required(),
      })
    )
    .required('Users are required'),
});

export const updateColumnsBodySchema = yup.array().of(
  yup.object().shape({
    id: yup.number().required('Column id is required').moreThan(0),
    order: yup.number().required('Order is required').moreThan(0),
    name: yup.string().required('Name is required'),
    description: yup.string().nullable(),
    color: yup.string(),
    type: yup.string().nullable(),
  })
);

export const createProjectBodySchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  prefix: yup.string().required('Prefix is required'),
  description: yup.string().nullable(),
  members: yup
    .array()
    .of(
      yup.object().shape({
        id: yup.number().required('User id is required').moreThan(0),
        role: yup.string().required('Role is required'),
      })
    )
    .nullable(),
  columns: yup
    .array()
    .of(
      yup.object().shape({
        name: yup.string().required('Name is required'),
        description: yup.string().nullable(),
        color: yup.string(),
        order: yup.number().required('Order is required').moreThan(0),
      })
    )
    .nullable(),
});
