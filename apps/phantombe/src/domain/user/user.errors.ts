import { createError } from "~/infra/utils/errors";

export enum UserErrorCode {
  NotLoggedIn = "NotLoggedIn",
  Unauthorized = "Unauthorized",
  NotAllowed = "NotAllowed",
  UserNotFound = "UserNotFound",
  LoginFailed = "LoginFailed",
  InvalidAuthToken = "InvalidAuthToken",
  ExpiredTokenError = "ExpiredTokenError",
  EmailAlreadyRegisteredError = "EmailAlreadyRegisteredError",
  CreateUserError = "CreateUserError",
  PasswordNotMatchedError = "PasswordNotMatchedError",
  UsernameExistedError = "UsernameExistedError",
}

export const NotLoggedInError = createError(
  UserErrorCode.NotLoggedIn,
  "Bạn chưa đăng nhập.",
  401
);

export const UnauthorizedError = createError(
  UserErrorCode.Unauthorized,
  "Bạn không có quyền truy cập.",
  401
);

export const NotAllowedError = createError(
  UserErrorCode.NotAllowed,
  "Bạn không có quyền thực hiện.",
  403
);

export const UserNotFoundError = createError(
  UserErrorCode.UserNotFound,
  "Không tìm thấy người dùng trong hệ thống.",
  404
);

export const LoginFailedError = createError(
  UserErrorCode.LoginFailed,
  "Đăng nhập lỗi.",
  401
);

export const InvalidAuthTokenError = createError(
  UserErrorCode.InvalidAuthToken,
  "Token không hợp lệ.",
  401
);

export const ExpiredTokenError = createError(
  UserErrorCode.ExpiredTokenError,
  "Token đã hết hạn.",
  401
);

export const EmailAlreadyRegisteredError = createError(
  UserErrorCode.EmailAlreadyRegisteredError,
  "Email đã được đăng ký.",
  400
);

export const CreateUserError = createError(
  UserErrorCode.CreateUserError,
  "Lỗi đăng ký người dùng.",
  500
);

export const PasswordNotMatchedError = createError(
  UserErrorCode.PasswordNotMatchedError,
  "Mật khẩu không khớp",
  400
);

export const UsernameExistedError = createError(
  UserErrorCode.UsernameExistedError,
  "Tên đăng nhập đã tốn tại.",
  409
);
