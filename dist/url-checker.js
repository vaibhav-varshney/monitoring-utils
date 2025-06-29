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
            // Special handling for HTML_Source__c URLs (similar to sample.ts logic)
            if (urlType === 'HTML_Source__c' && this.isAbsctlURL(url)) {
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
    getCookiesForDataStore() {
        // Simple manual cookie configuration
        const cookies = config_1.config.dataStore.cookies;
        if (!cookies) {
            console.log('🍪 No data store cookies configured');
            return '';
        }
        console.log(`🍪 Using configured cookies for data store requests`);
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
            // Get cookies for data store authentication
            const cookies = this.getCookiesForDataStore();
            // Create temporary directory for download
            const tempDir = path_1.default.join(process.cwd(), 'temp-downloads');
            await promises_1.default.mkdir(tempDir, { recursive: true });
            // Build absctl command with cookies if available
            let command = `absctl autobuild:download-logs -r ${runID} -f ${filename} -d ${tempDir}`;
            // Add cookie environment variable or header if cookies are available
            const env = { ...process.env };
            if (cookies) {
                env.COOKIE = cookies;
                console.log(`🍪 Using browser cookies for absctl request`);
            }
            try {
                const { stdout, stderr } = await this.execAsync(command, {
                    timeout: this.config.requestTimeoutMs,
                    env: env
                });
                // Check if file was downloaded successfully
                const filePath = path_1.default.join(tempDir, filename);
                const fileExists = await promises_1.default.access(filePath).then(() => true).catch(() => false);
                if (fileExists) {
                    // Clean up the downloaded file
                    await promises_1.default.unlink(filePath).catch(() => { });
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
                // If cookie authentication failed, provide helpful error message
                const errorMessage = execError.message || String(execError);
                const isAuthError = errorMessage.toLowerCase().includes('auth') ||
                    errorMessage.toLowerCase().includes('unauthorized') ||
                    errorMessage.toLowerCase().includes('forbidden');
                return {
                    url,
                    urlType,
                    isHealthy: false,
                    error: isAuthError ?
                        `absctl authentication failed: ${errorMessage} (check DATA_STORE_COOKIES configuration)` :
                        `absctl command failed: ${errorMessage}`,
                    responseTime: Date.now() - startTime
                };
            }
            finally {
                // Clean up temp directory
                await promises_1.default.rmdir(tempDir, { recursive: true }).catch(() => { });
            }
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