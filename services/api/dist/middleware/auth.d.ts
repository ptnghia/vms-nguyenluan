/**
 * Authentication Middleware
 * Protects routes and validates JWT tokens
 */
import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../services/auth.service';
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}
/**
 * Middleware to verify JWT token
 */
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to check user role
 */
export declare const authorize: (...allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Optional authentication - adds user if token present but doesn't require it
 */
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to require admin role
 * Combines authenticate + authorize('admin')
 */
export declare const requireAdmin: ((req: Request, res: Response, next: NextFunction) => void)[];
/**
 * Middleware to require operator or admin role
 */
export declare const requireOperator: ((req: Request, res: Response, next: NextFunction) => void)[];
//# sourceMappingURL=auth.d.ts.map