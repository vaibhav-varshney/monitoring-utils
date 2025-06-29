import { URLCheckResult, MonitoringConfig } from './types';
export declare class URLChecker {
    private config;
    private execAsync;
    constructor(config: MonitoringConfig);
    checkURL(url: string, urlType: 'Component_Screenshot_URL__c' | 'HTML_Source__c' | 'Screenshot_URL__c'): Promise<URLCheckResult>;
    private isAbsctlURL;
    private getCookiesForDataStore;
    private checkAbsctlURL;
    private checkAbsctlURLWithRetry;
    checkURLsWithRetry(url: string, urlType: 'Component_Screenshot_URL__c' | 'HTML_Source__c' | 'Screenshot_URL__c'): Promise<URLCheckResult>;
}
//# sourceMappingURL=url-checker.d.ts.map