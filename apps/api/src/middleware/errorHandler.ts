import type { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/appError';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const appError = err instanceof AppError ? err : new AppError('Internal Server Error', 500, err);
  if (appError.status >= 500) {
    console.error(appError);
  }

  res.status(appError.status).json({
    message: appError.message,
    details: appError.details ?? null
  });
};
