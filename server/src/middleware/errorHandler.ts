import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

/**
 * A domain/business-rule error that maps to a specific HTTP status code.
 * Throw this from routes/services to return a clean JSON error to the client.
 */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Wraps an async route handler so thrown/rejected errors reach the error middleware.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// 404 handler for unmatched routes.
export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
}

// Central error handler. Must be registered last, after all routes.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.flatten(),
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
}
