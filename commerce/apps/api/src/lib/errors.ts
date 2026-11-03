import type {ErrorCode} from '@sc/contracts';

/** Expected business failure with a stable code, HTTP status and a message safe to show customers. */
export class AppError extends Error {
  constructor(public readonly code: ErrorCode, public readonly status: number, message: string, public readonly details?: unknown) { super(message); }
}
export const notFound = (what = 'Resource') => new AppError('NOT_FOUND', 404, `${what} not found.`);
export const forbidden = () => new AppError('FORBIDDEN', 403, 'You do not have permission to do that.');
export const conflict = (code: ErrorCode, message: string, details?: unknown) => new AppError(code, 409, message, details);
