import { MonitoringReport } from './types';
export declare class Reporter {
    generateConsoleReport(report: MonitoringReport): Promise<void>;
    private printExecutiveSummary;
    private printURLTypeSummary;
    private printGranularURLBreakdown;
    private printDetailedResults;
    private printRecordDetails;
    private printRecommendations;
    private printQuickSummary;
    generateJSONReport(report: MonitoringReport, outputPath?: string): Promise<string>;
    generateCSVReport(report: MonitoringReport, outputPath?: string): Promise<string>;
}
//# sourceMappingURL=reporter.d.ts.map