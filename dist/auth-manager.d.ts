export interface AuthToken {
    token: string;
    retrievedAt: number;
    expiresIn?: number;
}
export declare class AuthManager {
    private cachedToken;
    private execAsync;
    private readonly TOKEN_REFRESH_THRESHOLD_MS;
    /**
     * Get JWT token automatically using absctl auth:login --show
     * Handles caching and automatic refresh
     */
    getJWTToken(): Promise<string>;
    /**
     * Retrieve token directly from absctl command
     */
    private retrieveTokenFromAbsctl;
    /**
     * Check if the cached token is expired or needs refresh
     */
    private isTokenExpired;
    /**
     * Force refresh the token (useful when we get auth errors)
     */
    refreshToken(): Promise<string>;
    /**
     * Format the token as a cookie string for HTTP requests
     */
    formatTokenAsCookie(token: string): string;
    /**
     * Clear the cached token (useful for logout or error recovery)
     */
    clearCache(): void;
}
//# sourceMappingURL=auth-manager.d.ts.map