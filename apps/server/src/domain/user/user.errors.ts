import { createError } from "~/infra/utils/errors";

const ErrorCodes = {
  NotLoggedIn: "NotLoggedInError",
  Unauthorized: "UnauthorizedError",
  NotAllowed: "NotAllowedError",
  UserNotFound: "UserNotFoundError",
  LoginFailed: "LoginFailedError",
  InvalidAuthToken: "InvalidAuthTokenError",
  ExpiredTokenError: "ExpiredTokenError",
  InvalidWebhookTypeError: "InvalidWebhookTypeError",
};

export const NotLoggedInError = createError(
  ErrorCodes.NotLoggedIn,
  "Bạn chưa đăng nhập.",
  401
);

export const UnauthorizedError = createError(
  ErrorCodes.Unauthorized,
  "Bạn không có quyền truy cập.",
  401
);

export const NotAllowedError = createError(
  ErrorCodes.NotAllowed,
  "Bạn không có quyền thực hiện.",
  403
);

export const UserNotFoundError = createError(
  ErrorCodes.UserNotFound,
  "Không tìm thấy người dùng trong hệ thống.",
  404
);

export const LoginFailedError = createError(
  ErrorCodes.LoginFailed,
  "Đăng nhập lỗi.",
  401
);

export const InvalidAuthTokenError = createError(
  ErrorCodes.InvalidAuthToken,
  "Token không hợp lệ.",
  401
);

export const ExpiredTokenError = createError(
  ErrorCodes.ExpiredTokenError,
  "Token đã hết hạn.",
  401
);

export const InvalidWebhookTypeError = createError(
  ErrorCodes.InvalidWebhookTypeError,
  "Webhook gửi lên không hợp lệ"
);
