"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.URLChecker = void 0;
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
class URLChecker {
    constructor(config) {
        this.execAsync = (0, util_1.promisify)(child_process_1.exec);
        this.config = config;
    }
    async checkURL(url, urlType) {
        const startTime = Date.now();
        try {
            // Check if this is an absctl URL for any URL type
            if (this.isAbsctlURL(url)) {
                return await this.checkAbsctlURL(url, urlType, startTime);
            }
            // Standard HTTP/HTTPS URL check
            const response = await axios_1.default.head(url, {
                timeout: this.config.requestTimeoutMs,
                validateStatus: (status) => status < 500, // Accept anything below 500 as potentially valid
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'AQUA-Monitoring-Bot/1.0'
                }
            });
            const responseTime = Date.now() - startTime;
            const isHealthy = response.status >= 200 && response.status < 400;
            return {
                url,
                urlType,
                isHealthy,
                status: response.status,
                responseTime
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            // Handle specific error cases
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                return {
                    url,
                    urlType,
                    isHealthy: false,
                    error: 'DNS resolution failed or connection refused',
                    responseTime
                };
            }
            if (error.code === 'ETIMEDOUT') {
                return {
                    url,
                    urlType,
                    isHealthy: false,
                    error: 'Request timeout',
                    responseTime
                };
            }
            if (error.response) {
                return {
                    url,
                    urlType,
                    isHealthy: false,
                    status: error.response.status,
                    error: `HTTP ${error.response.status}`,
                    responseTime
                };
            }
            return {
                url,
                urlType,
                isHealthy: false,
                error: error.message || String(error),
                responseTime
            };
        }
    }
    isAbsctlURL(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.searchParams.has('filename') && urlObj.searchParams.has('runID');
        }
        catch {
            return false;
        }
    }
    async getCookiesForDataStore() {
        // Option 1: Use automated JWT token retrieval (preferred)
        if (config_1.config.dataStore.useAutoAuth) {
            try {
                const jwtToken = await config_1.authManager.getJWTToken();
                return config_1.authManager.formatTokenAsCookie(jwtToken);
            }
            catch (error) {
                console.error('❌ Failed to get JWT token automatically:', error);
                // Fallback to manual cookies if available
                if (config_1.config.dataStore.cookies) {
                    console.log('🔄 Falling back to manual cookies from environment');
                    return config_1.config.dataStore.cookies;
                }
                // No fallback available
                throw error;
            }
        }
        // Option 2: Use manual cookies from environment (legacy)
        const cookies = config_1.config.dataStore.cookies;
        if (!cookies) {
            console.log('🍪 No data store authentication configured');
            return '';
        }
        return cookies;
    }
    async checkAbsctlURL(url, urlType, startTime) {
        try {
            const urlObj = new URL(url);
            const filename = urlObj.searchParams.get('filename');
            const runID = urlObj.searchParams.get('runID');
            if (!filename || !runID) {
                return {
                    url,
                    urlType,
                    isHealthy: false,
                    error: 'Missing filename or runID parameters',
                    responseTime: Date.now() - startTime
                };
            }
            // Check if absctl command exists
            try {
                await this.execAsync('which absctl');
            }
            catch {
                return {
                    url,
                    urlType,
                    isHealthy: false,
                    error: 'absctl command not found - please install absctl',
                    responseTime: Date.now() - startTime
                };
            }
            // Attempt to check the URL with authentication (including retry logic)
            return await this.checkAbsctlURLWithRetry(url, urlType, filename, runID, startTime);
        }
        catch (error) {
            return {
                url,
                urlType,
                isHealthy: false,
                error: `URL parsing error: ${error.message || String(error)}`,
                responseTime: Date.now() - startTime
            };
        }
    }
    async checkAbsctlURLWithRetry(url, urlType, filename, runID, startTime, isRetry = false) {
        try {
            // Get authentication cookies (automated or manual)
            const cookies = await this.getCookiesForDataStore();
            // Create temporary directory for download
            const tempDir = path_1.default.join(process.cwd(), 'temp-downloads');
            await promises_1.default.mkdir(tempDir, { recursive: true });
            // Build absctl command
            const command = `absctl autobuild:download-logs -r ${runID} -f ${filename} -d ${tempDir}`;
            // Add cookie environment variable if available
            const env = { ...process.env };
            if (cookies) {
                env.COOKIE = cookies;
            }
            try {
                const { stdout, stderr } = await this.execAsync(command, {
                    timeout: this.config.requestTimeoutMs,
                    env: env
                });
                // Check for "no logs found" or similar messages in stdout/stderr
                const output = (stdout + stderr).toLowerCase();
                const noLogsPatterns = [
                    'no logs found',
                    'logs not found',
                    'no files found',
                    'file not found',
                    'nothing to download',
                    'no such file',
                    'failed to find',
                    'download failed'
                ];
                const hasNoLogsMessage = noLogsPatterns.some(pattern => output.includes(pattern));
                if (hasNoLogsMessage) {
                    return {
                        url,
                        urlType,
                        isHealthy: false,
                        error: 'No logs found for the specified filename and runID',
                        responseTime: Date.now() - startTime
                    };
                }
                // Check if file was downloaded successfully
                const filePath = path_1.default.join(tempDir, filename);
                const fileExists = await promises_1.default.access(filePath).then(() => true).catch(() => false);
                if (fileExists) {
                    // Check if the file has content (not empty)
                    const stats = await promises_1.default.stat(filePath);
                    const fileSize = stats.size;
                    // Clean up the downloaded file
                    await promises_1.default.unlink(filePath).catch(() => { });
                    if (fileSize === 0) {
                        return {
                            url,
                            urlType,
                            isHealthy: false,
                            error: 'Downloaded file is empty - no content available',
                            responseTime: Date.now() - startTime
                        };
                    }
                    return {
                        url,
                        urlType,
                        isHealthy: true,
                        responseTime: Date.now() - startTime
                    };
                }
                else {
                    return {
                        url,
                        urlType,
                        isHealthy: false,
                        error: 'File download failed - file not found after command execution',
                        responseTime: Date.now() - startTime
                    };
                }
            }
            catch (execError) {
                const errorMessage = execError.message || String(execError);
                const isAuthError = errorMessage.toLowerCase().includes('auth') ||
                    errorMessage.toLowerCase().includes('unauthorized') ||
                    errorMessage.toLowerCase().includes('forbidden') ||
                    errorMessage.toLowerCase().includes('invalid token') ||
                    errorMessage.toLowerCase().includes('token expired');
                // If it's an auth error and we're using auto-auth and haven't retried yet, try refreshing the token
                if (isAuthError && config_1.config.dataStore.useAutoAuth && !isRetry) {
                    console.log('🔄 Authentication failed, attempting to refresh JWT token...');
                    try {
                        await config_1.authManager.refreshToken();
                        return await this.checkAbsctlURLWithRetry(url, urlType, filename, runID, startTime, true);
                    }
                    catch (refreshError) {
                        return {
                            url,
                            urlType,
                            isHealthy: false,
                            error: `Authentication failed even after token refresh: ${errorMessage}`,
                            responseTime: Date.now() - startTime
                        };
                    }
                }
                return {
                    url,
                    urlType,
                    isHealthy: false,
                    error: isAuthError ?
                        `absctl authentication failed: ${errorMessage}` :
                        `absctl command failed: ${errorMessage}`,
                    responseTime: Date.now() - startTime
                };
            }
            finally {
                // Clean up temp directory
                await promises_1.default.rmdir(tempDir, { recursive: true }).catch(() => { });
            }
        }
        catch (authError) {
            // Error getting authentication
            return {
                url,
                urlType,
                isHealthy: false,
                error: `Authentication setup failed: ${authError.message || String(authError)}`,
                responseTime: Date.now() - startTime
            };
        }
    }
    async checkURLsWithRetry(url, urlType) {
        let lastResult = null;
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                const result = await this.checkURL(url, urlType);
                if (result.isHealthy) {
                    return result;
                }
                lastResult = result;
                if (attempt < this.config.retryAttempts) {
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
            catch (error) {
                lastResult = {
                    url,
                    urlType,
                    isHealthy: false,
                    error: error instanceof Error ? error.message : String(error),
                    responseTime: 0
                };
            }
        }
        return lastResult || {
            url,
            urlType,
            isHealthy: false,
            error: 'All retry attempts failed',
            responseTime: 0
        };
    }
}
exports.URLChecker = URLChecker;
//# sourceMappingURL=url-checker.js.map