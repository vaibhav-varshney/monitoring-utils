import axios, { AxiosResponse } from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { URLCheckResult, MonitoringConfig } from './types';
import { config } from './config';

export class URLChecker {
  private config: MonitoringConfig;
  private execAsync = promisify(exec);

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  async checkURL(
    url: string, 
    urlType: 'Component_Screenshot_URL__c' | 'HTML_Source__c' | 'Screenshot_URL__c'
  ): Promise<URLCheckResult> {
    const startTime = Date.now();
    
    try {
      // Check if this is an absctl URL for any URL type
      if (this.isAbsctlURL(url)) {
        return await this.checkAbsctlURL(url, urlType, startTime);
      }

      // Standard HTTP/HTTPS URL check
      const response = await axios.head(url, {
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

    } catch (error: any) {
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

  private isAbsctlURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.has('filename') && urlObj.searchParams.has('runID');
    } catch {
      return false;
    }
  }

  private getCookiesForDataStore(): string {
    // Simple manual cookie configuration
    const cookies = config.dataStore.cookies;
    
    if (!cookies) {
      console.log('🍪 No data store cookies configured');
      return '';
    }

    return cookies;
  }

  private async checkAbsctlURL(
    url: string, 
    urlType: 'Component_Screenshot_URL__c' | 'HTML_Source__c' | 'Screenshot_URL__c', 
    startTime: number
  ): Promise<URLCheckResult> {
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
      } catch {
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
      const tempDir = path.join(process.cwd(), 'temp-downloads');
      await fs.mkdir(tempDir, { recursive: true });

      // Build absctl command with cookies if available
      let command = `absctl autobuild:download-logs -r ${runID} -f ${filename} -d ${tempDir}`;
      
      // Add cookie environment variable or header if cookies are available
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
        const filePath = path.join(tempDir, filename);
        const fileExists = await fs.access(filePath).then(() => true).catch(() => false);

        if (fileExists) {
          // Check if the file has content (not empty)
          const stats = await fs.stat(filePath);
          const fileSize = stats.size;
          
          // Clean up the downloaded file
          await fs.unlink(filePath).catch(() => {});
          
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
        } else {
          return {
            url,
            urlType,
            isHealthy: false,
            error: 'File download failed - file not found after command execution',
            responseTime: Date.now() - startTime
          };
        }

      } catch (execError: any) {
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
      } finally {
        // Clean up temp directory
        await fs.rmdir(tempDir, { recursive: true }).catch(() => {});
      }

    } catch (error: any) {
      return {
        url,
        urlType,
        isHealthy: false,
        error: `URL parsing error: ${error.message || String(error)}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  async checkURLsWithRetry(
    url: string, 
    urlType: 'Component_Screenshot_URL__c' | 'HTML_Source__c' | 'Screenshot_URL__c'
  ): Promise<URLCheckResult> {
    let lastResult: URLCheckResult | null = null;
    
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
        
      } catch (error) {
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