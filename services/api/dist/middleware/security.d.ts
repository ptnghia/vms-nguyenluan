import { Request, Response, NextFunction } from 'express';
/**
 * Security headers middleware using helmet
 */
export declare const securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
/**
 * CORS configuration
 */
export declare function configureCORS(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * Request logging middleware
 */
export declare function requestLogger(req: Request, res: Response, next: NextFunction): void;
/**
 * Error handler middleware
 */
export declare function errorHandler(err: any, req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * 404 handler
 */
export declare function notFoundHandler(req: Request, res: Response): void;
/**
 * Request size limiter
 */
export declare function requestSizeLimiter(maxSize?: string): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * IP whitelist middleware
 */
export declare function ipWhitelist(allowedIPs: string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Prevent parameter pollution
 */
export declare function preventParameterPollution(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=security.d.ts.map