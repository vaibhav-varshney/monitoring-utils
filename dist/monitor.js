"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringService = void 0;
const url_checker_1 = require("./url-checker");
class MonitoringService {
    constructor(salesforceService, config) {
        this.salesforceService = salesforceService;
        this.urlChecker = new url_checker_1.URLChecker(config);
        this.config = config;
    }
    async runMonitoring() {
        console.log('🚀 Starting AQUA ViolationGroup URL monitoring...\n');
        // Get all violation groups
        const violationGroups = await this.salesforceService.getAllViolationGroups();
        if (violationGroups.length === 0) {
            console.log('⚠️  No AQUA ViolationGroup records found with URLs');
            return this.createEmptyReport();
        }
        console.log(`🔍 Processing ${violationGroups.length} records...\n`);
        // Process records in batches to avoid overwhelming the system
        const batchSize = this.config.maxConcurrentChecks;
        const results = [];
        for (let i = 0; i < violationGroups.length; i += batchSize) {
            const batch = violationGroups.slice(i, i + batchSize);
            const batchPromises = batch.map(record => this.processViolationGroup(record));
            console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(violationGroups.length / batchSize)}...`);
            const batchResults = await Promise.allSettled(batchPromises);
            // Handle fulfilled and rejected promises
            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
                else {
                    console.error(`❌ Error processing record ${batch[index].Name}: ${result.reason}`);
                    // Create a failed result
                    results.push({
                        record: batch[index],
                        urlChecks: [],
                        overallHealth: 'broken'
                    });
                }
            });
            // Small delay between batches to be respectful
            if (i + batchSize < violationGroups.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return this.generateReport(results);
    }
    async processViolationGroup(record) {
        const urlChecks = [];
        const urlPromises = [];
        // Collect all URLs to check
        const urlTypes = [
            'Component_Screenshot_URL__c',
            'HTML_Source__c',
            'Screenshot_URL__c'
        ];
        for (const urlType of urlTypes) {
            const url = record[urlType];
            if (url && url.trim()) {
                urlPromises.push(this.urlChecker.checkURLsWithRetry(url.trim(), urlType));
            }
        }
        // Execute all URL checks for this record in parallel
        if (urlPromises.length > 0) {
            const results = await Promise.allSettled(urlPromises);
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    urlChecks.push(result.value);
                }
            });
        }
        // Determine overall health
        let overallHealth = 'healthy';
        if (urlChecks.length === 0) {
            overallHealth = 'broken';
        }
        else {
            const healthyCount = urlChecks.filter(check => check.isHealthy).length;
            const totalCount = urlChecks.length;
            if (healthyCount === 0) {
                overallHealth = 'broken';
            }
            else if (healthyCount < totalCount) {
                overallHealth = 'partial';
            }
        }
        console.log(`✅ Processed ${record.Name}: ${overallHealth} (${urlChecks.filter(c => c.isHealthy).length}/${urlChecks.length} URLs healthy)`);
        return {
            record,
            urlChecks,
            overallHealth
        };
    }
    generateReport(results) {
        const totalRecords = results.length;
        const healthyRecords = results.filter(r => r.overallHealth === 'healthy').length;
        const partialRecords = results.filter(r => r.overallHealth === 'partial').length;
        const brokenRecords = results.filter(r => r.overallHealth === 'broken').length;
        // Generate URL type summary
        const urlTypeSummary = {};
        const urlTypes = ['Component_Screenshot_URL__c', 'HTML_Source__c', 'Screenshot_URL__c'];
        for (const urlType of urlTypes) {
            urlTypeSummary[urlType] = { total: 0, healthy: 0, broken: 0 };
        }
        // Count URL statistics
        results.forEach(result => {
            result.urlChecks.forEach(check => {
                const summary = urlTypeSummary[check.urlType];
                if (summary) {
                    summary.total++;
                    if (check.isHealthy) {
                        summary.healthy++;
                    }
                    else {
                        summary.broken++;
                    }
                }
            });
        });
        return {
            totalRecords,
            healthyRecords,
            partialRecords,
            brokenRecords,
            urlTypeSummary,
            detailedResults: results
        };
    }
    createEmptyReport() {
        return {
            totalRecords: 0,
            healthyRecords: 0,
            partialRecords: 0,
            brokenRecords: 0,
            urlTypeSummary: {
                'Component_Screenshot_URL__c': { total: 0, healthy: 0, broken: 0 },
                'HTML_Source__c': { total: 0, healthy: 0, broken: 0 },
                'Screenshot_URL__c': { total: 0, healthy: 0, broken: 0 }
            },
            detailedResults: []
        };
    }
}
exports.MonitoringService = MonitoringService;
//# sourceMappingURL=monitor.js.map