import { SalesforceService } from './salesforce';
import { MonitoringReport, MonitoringConfig } from './types';
export declare class MonitoringService {
    private salesforceService;
    private urlChecker;
    private config;
    constructor(salesforceService: SalesforceService, config: MonitoringConfig);
    runMonitoring(): Promise<MonitoringReport>;
    private processViolationGroup;
    private generateReport;
    private createEmptyReport;
}
//# sourceMappingURL=monitor.d.ts.map