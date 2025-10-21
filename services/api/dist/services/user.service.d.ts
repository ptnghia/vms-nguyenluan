export interface User {
    id: string;
    username: string;
    email: string;
    full_name: string | null;
    role: string;
    active: boolean;
    last_login: Date | null;
    created_at: Date;
    updated_at: Date;
}
export interface UserFilter {
    role?: string;
    active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}
export interface CreateUserInput {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    role?: string;
}
export interface UpdateUserInput {
    email?: string;
    full_name?: string;
    role?: string;
    active?: boolean;
}
export declare class UserService {
    /**
     * Get users with filters and pagination
     */
    getUsers(filter: UserFilter): Promise<{
        users: User[];
        total: number;
    }>;
    /**
     * Get user by ID
     */
    getUserById(id: string): Promise<User | null>;
    /**
     * Get user by username
     */
    getUserByUsername(username: string): Promise<User | null>;
    /**
     * Create new user
     */
    createUser(input: CreateUserInput): Promise<User>;
    /**
     * Update user
     */
    updateUser(id: string, input: UpdateUserInput): Promise<User>;
    /**
     * Change user password
     */
    changePassword(id: string, newPassword: string): Promise<void>;
    /**
     * Change user role
     */
    changeRole(id: string, role: string): Promise<User>;
    /**
     * Delete user
     */
    deleteUser(id: string): Promise<boolean>;
    /**
     * Update last login timestamp
     */
    updateLastLogin(id: string): Promise<void>;
    /**
     * Get user statistics
     */
    getStats(): Promise<{
        totalUsers: number;
        activeUsers: number;
        byRole: Array<{
            role: string;
            count: number;
        }>;
    }>;
}
export declare const userService: UserService;
//# sourceMappingURL=user.service.d.ts.map