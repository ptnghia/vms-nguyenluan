/**
 * Authentication Configuration
 * JWT token settings and secrets
 */
export declare const authConfig: {
    jwtSecret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    bcryptRounds: number;
    issuer: string;
    roles: {
        ADMIN: string;
        OPERATOR: string;
        VIEWER: string;
    };
};
//# sourceMappingURL=auth.d.ts.map