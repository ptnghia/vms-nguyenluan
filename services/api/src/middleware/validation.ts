import { Request, Response, NextFunction } from 'express';

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate RTSP URL format
 */
export function isValidRtspUrl(url: string): boolean {
  return url.startsWith('rtsp://') || url.startsWith('rtsps://');
}

/**
 * Sanitize string (remove dangerous characters)
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize pagination parameters
 */
export function validatePagination(req: Request, res: Response, next: NextFunction) {
  const { page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      success: false,
      error: 'Invalid page number'
    });
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      error: 'Invalid limit (must be between 1 and 100)'
    });
  }

  // Attach validated values to request
  req.query.page = String(pageNum);
  req.query.limit = String(limitNum);

  next();
}

/**
 * Validate UUID parameter
 */
export function validateUUID(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const uuid = req.params[paramName];

    if (!uuid || !isValidUUID(uuid)) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format`
      });
    }

    next();
  };
}

/**
 * Validate required fields in request body
 */
export function validateRequired(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = fields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        fields: missing
      });
    }

    next();
  };
}

/**
 * Validate email in request body
 */
export function validateEmail(req: Request, res: Response, next: NextFunction) {
  const { email } = req.body;

  if (email && !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  next();
}

/**
 * Validate password strength
 */
export function validatePassword(req: Request, res: Response, next: NextFunction) {
  const { password } = req.body;

  if (!password) {
    return next();
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long'
    });
  }

  // Optional: Add more password requirements
  // const hasUpperCase = /[A-Z]/.test(password);
  // const hasLowerCase = /[a-z]/.test(password);
  // const hasNumbers = /\d/.test(password);
  // const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  next();
}

/**
 * Validate RTSP URL
 */
export function validateRtspUrl(req: Request, res: Response, next: NextFunction) {
  const { rtsp_url } = req.body;

  if (rtsp_url && !isValidRtspUrl(rtsp_url)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid RTSP URL format (must start with rtsp:// or rtsps://)'
    });
  }

  next();
}

/**
 * Sanitize request body strings
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    }
  }

  next();
}

/**
 * Validate date range
 */
export function validateDateRange(req: Request, res: Response, next: NextFunction) {
  const { startDate, endDate } = req.query;

  if (startDate) {
    const start = new Date(startDate as string);
    if (isNaN(start.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid startDate format'
      });
    }
  }

  if (endDate) {
    const end = new Date(endDate as string);
    if (isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid endDate format'
      });
    }
  }

  if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    if (start > end) {
      return res.status(400).json({
        success: false,
        error: 'startDate must be before endDate'
      });
    }
  }

  next();
}

/**
 * Validate enum value
 */
export function validateEnum(field: string, allowedValues: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body[field] || req.query[field];

    if (value && !allowedValues.includes(value as string)) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${field} value`,
        allowedValues
      });
    }

    next();
  };
}

/**
 * Validate number range
 */
export function validateNumberRange(field: string, min: number, max: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body[field] || req.query[field];

    if (value !== undefined) {
      const num = Number(value);
      
      if (isNaN(num)) {
        return res.status(400).json({
          success: false,
          error: `${field} must be a number`
        });
      }

      if (num < min || num > max) {
        return res.status(400).json({
          success: false,
          error: `${field} must be between ${min} and ${max}`
        });
      }
    }

    next();
  };
}

