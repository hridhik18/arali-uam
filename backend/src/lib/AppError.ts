export type ErrorCode =
  | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'CONFLICT' | 'CONFLICT_LAST_ADMIN' | 'CONFLICT_SELF_DEACTIVATE'
  | 'CONFLICT_DEACTIVATED_USER' | 'CONFLICT_DUPLICATE_NAME'
  | 'INTERNAL';

export class AppError extends Error {
  constructor(public statusCode: number, public code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
  }
  static badRequest(m = 'Bad request') { return new AppError(400, 'BAD_REQUEST', m); }
  static unauthorized(m = 'Not authenticated') { return new AppError(401, 'UNAUTHORIZED', m); }
  static forbidden(m = 'Not authorized') { return new AppError(403, 'FORBIDDEN', m); }
  static notFound(m = 'Not found') { return new AppError(404, 'NOT_FOUND', m); }
  static conflict(code: ErrorCode, m: string) { return new AppError(409, code, m); }
}
