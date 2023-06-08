import * as yup from 'yup';

export const loginSchema = yup.object().shape({
  email: yup.string().email().required('Email is required'),
  password: yup.string().required('Password is required'),
});

export const specificProjectParamsSchema = yup.object().shape({
  id: yup.number().required('Id is required').moreThan(0),
});
