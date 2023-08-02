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
  description: yup.string().required('Description is required'),
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
