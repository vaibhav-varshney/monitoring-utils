export interface AQUAViolationGroup {
    Id: string;
    Name: string;
    Component_Screenshot_URL__c?: string;
    HTML_Source__c?: string;
    Screenshot_URL__c?: string;
}
export interface URLCheckResult {
    url: string;
    isHealthy: boolean;
    status?: number;
    error?: string;
    responseTime?: number;
    urlType: 'Component_Screenshot_URL__c' | 'HTML_Source__c' | 'Screenshot_URL__c';
}
export interface ViolationGroupResult {
    record: AQUAViolationGroup;
    urlChecks: URLCheckResult[];
    overallHealth: 'healthy' | 'partial' | 'broken';
}
export interface MonitoringReport {
    totalRecords: number;
    healthyRecords: number;
    partialRecords: number;
    brokenRecords: number;
    urlTypeSummary: {
        [key: string]: {
            total: number;
            healthy: number;
            broken: number;
            notAvailable: number;
        };
    };
    detailedResults: ViolationGroupResult[];
}
export interface MonitoringConfig {
    maxConcurrentChecks: number;
    requestTimeoutMs: number;
    retryAttempts: number;
}
//# sourceMappingURL=types.d.ts.map