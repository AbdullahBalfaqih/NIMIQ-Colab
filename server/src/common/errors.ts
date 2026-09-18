/**
 * Structured application errors with machine-readable codes.
 * Never expose stack traces or internal details to clients.
 */

export type ErrorCode =
  // Auth
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'FORBIDDEN'
  // Validation
  | 'VALIDATION_ERROR'
  | 'INVALID_AMOUNT'
  | 'INVALID_CURRENCY'
  | 'INVALID_UUID'
  | 'INVALID_DATE'
  | 'PAYLOAD_TOO_LARGE'
  // Resources
  | 'NOT_FOUND'
  | 'GROUP_NOT_FOUND'
  | 'GOAL_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'PAYMENT_REQUEST_NOT_FOUND'
  | 'PAYMENT_INTENT_NOT_FOUND'
  // Conflicts
  | 'ALREADY_EXISTS'
  | 'ALREADY_MEMBER'
  | 'EMAIL_TAKEN'
  | 'IDEMPOTENCY_CONFLICT'
  // Payment
  | 'PAYMENT_INVALID_STATE'
  | 'PAYMENT_EXPIRED'
  | 'PAYMENT_VERIFICATION_FAILED'
  | 'PAYMENT_AMOUNT_MISMATCH'
  | 'PAYMENT_RECIPIENT_MISMATCH'
  | 'PAYMENT_DUPLICATE_TRANSACTION'
  | 'PAYMENT_REPLAY_DETECTED'
  | 'PAYMENT_INTENT_ALREADY_CONFIRMED'
  | 'PAYMENT_CURRENCY_MISMATCH'
  // AI
  | 'AI_ACTION_NOT_FOUND'
  | 'AI_ACTION_EXPIRED'
  | 'AI_ACTION_ALREADY_PROCESSED'
  | 'AI_RATE_LIMITED'
  // Authorization
  | 'ACCESS_DENIED'
  | 'INSUFFICIENT_ROLE'
  // System
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'RATE_LIMITED';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(code: ErrorCode, message: string, statusCode = 400, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthError extends AppError {
  constructor(code: ErrorCode = 'UNAUTHORIZED', message = 'Authentication required') {
    super(code, message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(code: ErrorCode = 'NOT_FOUND', message = 'Resource not found') {
    super(code, message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(code: ErrorCode = 'ALREADY_EXISTS', message = 'Resource already exists') {
    super(code, message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

export class PaymentError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 422);
  }
}

export class AnomalyError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 422);
  }
}

export class InternalError extends AppError {
  constructor(message = 'An internal error occurred') {
    super('INTERNAL_ERROR', message, 500, false);
  }
}

/** Format error response for client — never leaks internals */
export function formatErrorResponse(error: AppError, requestId: string) {
  return {
    error: {
      code: error.code,
      message: error.message,
      requestId,
    },
  };
}
