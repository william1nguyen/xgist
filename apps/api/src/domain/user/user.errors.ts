import {createError} from '~/infra/utils/errors';

const ErrorCodes = {
  RegisterUserFailed: 'RegisterUserFailedError',
  NotLoggedIn: 'NotLoggedInError',
  Unauthorized: 'UnauthorizedError',
  NotAllowed: 'NotAllowedError',
  UserNotFound: 'UserNotFoundError',
  LoginFailed: 'LoginFailedError',
  InvalidAuthToken: 'InvalidAuthTokenError',
  ExpiredTokenError: 'ExpiredTokenError',
  InvalidWebhookTypeError: 'InvalidWebhookTypeError',
};

export const RegisterUserFailedError = createError(
  ErrorCodes.RegisterUserFailed,
  'Failed to register new user.',
  400
);

export const NotLoggedInError = createError(
  ErrorCodes.NotLoggedIn,
  'Authentication required.',
  401
);

export const UnauthorizedError = createError(
  ErrorCodes.Unauthorized,
  'Invalid credentials.',
  401
);

export const NotAllowedError = createError(
  ErrorCodes.NotAllowed,
  'Access denied.',
  403
);

export const UserNotFoundError = createError(
  ErrorCodes.UserNotFound,
  'User not found.',
  404
);

export const LoginFailedError = createError(
  ErrorCodes.LoginFailed,
  'Login failed.',
  401
);

export const InvalidAuthTokenError = createError(
  ErrorCodes.InvalidAuthToken,
  'Invalid authentication token.',
  401
);

export const ExpiredTokenError = createError(
  ErrorCodes.ExpiredTokenError,
  'Authentication token has expired.',
  401
);

export const InvalidWebhookTypeError = createError(
  ErrorCodes.InvalidWebhookTypeError,
  'Invalid webhook type.',
  400
);
