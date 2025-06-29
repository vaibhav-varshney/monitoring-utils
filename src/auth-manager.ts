import { exec } from 'child_process';
import { promisify } from 'util';

export interface AuthToken {
  token: string;
  retrievedAt: number;
  expiresIn?: number;
}

export class AuthManager {
  private cachedToken: AuthToken | null = null;
  private execAsync = promisify(exec);
  private readonly TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry

  /**
   * Get JWT token automatically using absctl auth:login --show
   * Handles caching and automatic refresh
   */
  async getJWTToken(): Promise<string> {
    try {
      // Check if we have a valid cached token
      if (this.cachedToken && !this.isTokenExpired(this.cachedToken)) {
        return this.cachedToken.token;
      }

      console.log('🔄 Retrieving JWT token from absctl...');
      const token = await this.retrieveTokenFromAbsctl();
      
      // Cache the token
      this.cachedToken = {
        token,
        retrievedAt: Date.now(),
        // Most JWT tokens expire in 1 hour, but we don't parse the JWT here
        // We'll refresh proactively after 55 minutes
        expiresIn: 55 * 60 * 1000 // 55 minutes in milliseconds
      };

      console.log('✅ JWT token retrieved successfully');
      return token;

    } catch (error) {
      console.error('❌ Failed to retrieve JWT token:', error);
      throw new Error(`JWT token retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieve token directly from absctl command
   */
  private async retrieveTokenFromAbsctl(): Promise<string> {
    try {
      // Check if absctl command exists
      await this.execAsync('which absctl');
    } catch {
      throw new Error('absctl command not found - please install absctl and ensure it\'s in your PATH');
    }

    try {
      const { stdout, stderr } = await this.execAsync('absctl auth:login --show', {
        timeout: 30000 // 30 second timeout
      });

      if (stderr && stderr.trim()) {
        console.warn('⚠️  absctl stderr:', stderr.trim());
      }

      const output = stdout.trim();
      
      if (!output) {
        throw new Error('No output returned from absctl auth:login --show');
      }

      // Extract JWT token from output - look for the token that starts with 'eyJ'
      const lines = output.split('\n');
      let token = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('eyJ')) {
          token = trimmedLine;
          break;
        }
      }

      if (!token) {
        // Fallback: try to find a JWT-like pattern in the entire output
        const jwtPattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;
        const match = output.match(jwtPattern);
        if (match) {
          token = match[0];
        }
      }

      if (!token) {
        throw new Error('No JWT token found in absctl output');
      }

      // Basic validation - JWT tokens typically start with 'eyJ'
      if (!token.startsWith('eyJ')) {
        console.warn('⚠️  Retrieved token doesn\'t look like a JWT (doesn\'t start with "eyJ")');
      }

      return token;

    } catch (execError: any) {
      const errorMessage = execError.message || String(execError);
      
      // Provide helpful error messages for common issues
      if (errorMessage.includes('not logged in') || errorMessage.includes('authentication required')) {
        throw new Error('Not logged in to absctl. Please run "absctl auth:login" first to authenticate');
      }
      
      if (errorMessage.includes('timeout')) {
        throw new Error('Timeout while retrieving token from absctl. Please check your network connection');
      }

      throw new Error(`absctl command failed: ${errorMessage}`);
    }
  }

  /**
   * Check if the cached token is expired or needs refresh
   */
  private isTokenExpired(tokenInfo: AuthToken): boolean {
    if (!tokenInfo.expiresIn) {
      // If we don't know the expiry, refresh after 30 minutes
      return (Date.now() - tokenInfo.retrievedAt) > (30 * 60 * 1000);
    }

    const timeUntilExpiry = tokenInfo.expiresIn - (Date.now() - tokenInfo.retrievedAt);
    return timeUntilExpiry <= this.TOKEN_REFRESH_THRESHOLD_MS;
  }

  /**
   * Force refresh the token (useful when we get auth errors)
   */
  async refreshToken(): Promise<string> {
    console.log('🔄 Force refreshing JWT token...');
    this.cachedToken = null; // Clear cache
    return await this.getJWTToken();
  }

  /**
   * Format the token as a cookie string for HTTP requests
   */
  formatTokenAsCookie(token: string): string {
    // The exact cookie format may depend on your system
    // Common patterns: "token=<jwt>" or "Authorization=Bearer <jwt>" or just the raw token
    return `jwt=${token}`;
  }

  /**
   * Clear the cached token (useful for logout or error recovery)
   */
  clearCache(): void {
    this.cachedToken = null;
  }
} 