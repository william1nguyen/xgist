import {createError} from '~/infra/utils/errors';

const ErrorCodes = {
  MediaNotFound: 'MediaNotFoundError',
  CreateMediaFailed: 'CreateMediaFailedError',
  UpdateMediaFailed: 'UpdateMediaFailedError',
  RemoveMediaFailed: 'RemoveMediaFailedError',
};

export const MediaNotFoundError = createError(
  ErrorCodes.MediaNotFound,
  'Media not found!',
  404
);

export const CreateMediaFailedError = createError(
  ErrorCodes.CreateMediaFailed,
  'Failed to create new media.',
  400
);

export const UpdateMediaFailedError = createError(
  ErrorCodes.UpdateMediaFailed,
  'Failed to update media information.',
  400
);

export const RemoveMediaFailedError = createError(
  ErrorCodes.RemoveMediaFailed,
  'Failed to remove media.',
  400
);
