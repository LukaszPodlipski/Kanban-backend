import * as yup from 'yup';

export const loginSchema = yup.object().shape({
  email: yup.string().email().required('Email is required'),
  password: yup.string().required('Password is required'),
});

export const specificProjectParamsSchema = yup.object().shape({
  id: yup.number().required('Id is required').moreThan(0),
});

export const createColumnBodySchema = yup.object().shape({
  order: yup.number().required('Order is required').moreThan(0),
  name: yup.string().required('Name is required'),
});

export const createTaskBodySchema = yup.object().shape({
  description: yup.string().required('Description is required'),
  name: yup.string().required('Name is required'),
  assigneeId: yup.number().moreThan(0),
  projectColumnId: yup.number().moreThan(0),
});