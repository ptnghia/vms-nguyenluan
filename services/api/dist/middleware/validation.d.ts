import { Request, Response, NextFunction } from 'express';
/**
 * Validation error class
 */
export declare class ValidationError extends Error {
    field: string;
    constructor(field: string, message: string);
}
/**
 * Validate UUID format
 */
export declare function isValidUUID(uuid: string): boolean;
/**
 * Validate email format
 */
export declare function isValidEmail(email: string): boolean;
/**
 * Validate URL format
 */
export declare function isValidUrl(url: string): boolean;
/**
 * Validate RTSP URL format
 */
export declare function isValidRtspUrl(url: string): boolean;
/**
 * Sanitize string (remove dangerous characters)
 */
export declare function sanitizeString(str: string): string;
/**
 * Validate and sanitize pagination parameters
 */
export declare function validatePagination(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * Validate UUID parameter
 */
export declare function validateUUID(paramName?: string): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Validate required fields in request body
 */
export declare function validateRequired(fields: string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Validate email in request body
 */
export declare function validateEmail(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * Validate password strength
 */
export declare function validatePassword(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
/**
 * Validate RTSP URL
 */
export declare function validateRtspUrl(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * Sanitize request body strings
 */
export declare function sanitizeBody(req: Request, res: Response, next: NextFunction): void;
/**
 * Validate date range
 */
export declare function validateDateRange(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * Validate enum value
 */
export declare function validateEnum(field: string, allowedValues: string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Validate number range
 */
export declare function validateNumberRange(field: string, min: number, max: number): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=validation.d.ts.map