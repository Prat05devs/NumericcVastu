import type {NextFunction, Request, Response} from 'express';
import {TransitionError} from '@sc/contracts';
import {AppError} from '../lib/errors.js';
import {logger} from '../lib/logger.js';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError('NOT_FOUND', 404, 'Not found.'));
}

/** Stable error envelope. Unexpected errors are logged with the request id and never leak internals. */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const requestId = res.locals['requestId'];
  let e: AppError;
  if (error instanceof AppError) e = error;
  else if (error instanceof TransitionError) e = new AppError('ILLEGAL_TRANSITION', 409, error.message);
  else if ((error as {type?: string})?.type === 'entity.parse.failed') e = new AppError('VALIDATION_FAILED', 400, 'Malformed JSON body.');
  else if ((error as {type?: string})?.type === 'entity.too.large') e = new AppError('VALIDATION_FAILED', 413, 'Request body too large.');
  else {
    logger.error({requestId, err: error}, 'unhandled error');
    e = new AppError('INTERNAL', 500, 'Something went wrong. Please try again.');
  }
  if (res.headersSent) return;
  res.setHeader('Cache-Control', 'no-store');
  res.status(e.status).json({error: {code: e.code, message: e.message, ...(e.details !== undefined && {details: e.details})}, meta: {requestId}});
}
