"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reporter = void 0;
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const promises_1 = __importDefault(require("fs/promises"));
class Reporter {
    async generateConsoleReport(report) {
        console.log('\n' + '='.repeat(80));
        console.log(chalk_1.default.bold.blue('AQUA VIOLATIONGROUP URL MONITORING REPORT'));
        console.log('='.repeat(80));
        // Executive Summary
        this.printExecutiveSummary(report);
        // URL Type Summary
        this.printURLTypeSummary(report);
        // Detailed Results
        if (report.detailedResults.length > 0) {
            this.printDetailedResults(report);
        }
        // Recommendations
        this.printRecommendations(report);
        // Quick Summary
        this.printQuickSummary(report);
        console.log('='.repeat(80) + '\n');
    }
    printExecutiveSummary(report) {
        console.log(chalk_1.default.bold.yellow('\n📊 EXECUTIVE SUMMARY'));
        console.log('-'.repeat(50));
        const table = new cli_table3_1.default({
            head: ['Metric', 'Count', 'Percentage'],
            colWidths: [25, 10, 15]
        });
        const healthyPercent = report.totalRecords > 0 ?
            ((report.healthyRecords / report.totalRecords) * 100).toFixed(1) : '0.0';
        const partialPercent = report.totalRecords > 0 ?
            ((report.partialRecords / report.totalRecords) * 100).toFixed(1) : '0.0';
        const brokenPercent = report.totalRecords > 0 ?
            ((report.brokenRecords / report.totalRecords) * 100).toFixed(1) : '0.0';
        table.push(['Total Records', report.totalRecords.toString(), '100.0%'], [chalk_1.default.green('Healthy Records'), chalk_1.default.green(report.healthyRecords.toString()), chalk_1.default.green(`${healthyPercent}%`)], [chalk_1.default.yellow('Partial Records'), chalk_1.default.yellow(report.partialRecords.toString()), chalk_1.default.yellow(`${partialPercent}%`)], [chalk_1.default.red('Broken Records'), chalk_1.default.red(report.brokenRecords.toString()), chalk_1.default.red(`${brokenPercent}%`)]);
        console.log(table.toString());
    }
    printURLTypeSummary(report) {
        console.log(chalk_1.default.bold.yellow('\n🔗 URL TYPE SUMMARY'));
        console.log('-'.repeat(50));
        const table = new cli_table3_1.default({
            head: ['URL Type', 'Total', 'Healthy', 'Broken', 'Not Available', 'Health %'],
            colWidths: [25, 8, 10, 10, 15, 12]
        });
        Object.entries(report.urlTypeSummary).forEach(([urlType, stats]) => {
            if (stats.total > 0) {
                const availableCount = stats.total - stats.notAvailable;
                const healthPercent = availableCount > 0 ? ((stats.healthy / availableCount) * 100).toFixed(1) : 'N/A';
                const healthColor = stats.healthy === availableCount ? chalk_1.default.green :
                    stats.healthy === 0 ? chalk_1.default.red : chalk_1.default.yellow;
                table.push([
                    urlType.replace('__c', ''),
                    stats.total.toString(),
                    healthColor(stats.healthy.toString()),
                    stats.broken > 0 ? chalk_1.default.red(stats.broken.toString()) : '0',
                    stats.notAvailable > 0 ? chalk_1.default.gray(stats.notAvailable.toString()) : '0',
                    healthPercent !== 'N/A' ? healthColor(`${healthPercent}%`) : chalk_1.default.gray('N/A')
                ]);
            }
        });
        console.log(table.toString());
        // Add granular breakdown
        this.printGranularURLBreakdown(report);
    }
    printGranularURLBreakdown(report) {
        console.log(chalk_1.default.bold.yellow('\n📋 GRANULAR URL BREAKDOWN'));
        console.log('-'.repeat(50));
        const urlTypeDisplayNames = {
            'Component_Screenshot_URL__c': 'Component Screenshot URLs',
            'HTML_Source__c': 'HTML Source URLs',
            'Screenshot_URL__c': 'Screenshot URLs'
        };
        Object.entries(report.urlTypeSummary).forEach(([urlType, stats]) => {
            if (stats.total > 0) {
                const displayName = urlTypeDisplayNames[urlType] || urlType.replace('__c', '');
                const availableCount = stats.total - (stats.notAvailable || 0);
                const status = stats.broken === 0 && availableCount > 0 ? '✅' :
                    stats.healthy === 0 && availableCount > 0 ? '❌' : '⚠️';
                let statusText = `${chalk_1.default.green(stats.healthy)}/${stats.total} healthy`;
                if (stats.broken > 0) {
                    statusText += `, ${chalk_1.default.red(`${stats.broken} broken`)}`;
                }
                if ((stats.notAvailable || 0) > 0) {
                    statusText += `, ${chalk_1.default.gray(`${stats.notAvailable} not available`)}`;
                }
                console.log(`${status} ${chalk_1.default.bold(displayName)}: ${statusText}`);
                if (stats.broken > 0 && availableCount > 0) {
                    const brokenPercent = ((stats.broken / availableCount) * 100).toFixed(1);
                    console.log(`   ${chalk_1.default.red(`→ ${stats.broken}/${availableCount} available ${displayName.toLowerCase()} are broken (${brokenPercent}%)`)}`);
                }
                if ((stats.notAvailable || 0) > 0) {
                    console.log(`   ${chalk_1.default.gray(`→ ${stats.notAvailable}/${stats.total} ${displayName.toLowerCase()} are not available in records`)}`);
                }
            }
        });
    }
    printDetailedResults(report) {
        console.log(chalk_1.default.bold.yellow('\n📋 DETAILED RESULTS'));
        console.log('-'.repeat(50));
        // Group results by health status
        const brokenRecords = report.detailedResults.filter(r => r.overallHealth === 'broken');
        const partialRecords = report.detailedResults.filter(r => r.overallHealth === 'partial');
        // Show broken records first
        if (brokenRecords.length > 0) {
            console.log(chalk_1.default.red.bold(`\n❌ BROKEN RECORDS (${brokenRecords.length})`));
            this.printRecordDetails(brokenRecords, 'broken');
        }
        // Show partial records
        if (partialRecords.length > 0) {
            console.log(chalk_1.default.yellow.bold(`\n⚠️  PARTIAL RECORDS (${partialRecords.length})`));
            this.printRecordDetails(partialRecords, 'partial');
        }
        // Summary of healthy records
        const healthyRecords = report.detailedResults.filter(r => r.overallHealth === 'healthy');
        if (healthyRecords.length > 0) {
            console.log(chalk_1.default.green.bold(`\n✅ HEALTHY RECORDS (${healthyRecords.length})`));
            console.log(chalk_1.default.green('All URLs in these records are functioning correctly.'));
            // List healthy record names in a compact format
            const healthyNames = healthyRecords.map(r => r.record.Name).slice(0, 10);
            console.log(chalk_1.default.gray(`Examples: ${healthyNames.join(', ')}${healthyRecords.length > 10 ? ` ... and ${healthyRecords.length - 10} more` : ''}`));
        }
    }
    printRecordDetails(records, status) {
        const table = new cli_table3_1.default({
            head: ['Record Name', 'Record ID', 'URL Type', 'Status', 'Error/Response Time'],
            colWidths: [20, 20, 25, 15, 30]
        });
        records.forEach(record => {
            const hasURLs = record.urlChecks.length > 0;
            if (!hasURLs) {
                table.push([
                    record.record.Name || 'N/A',
                    record.record.Id,
                    'No URLs found',
                    chalk_1.default.red('BROKEN'),
                    'No URLs to check'
                ]);
            }
            else {
                record.urlChecks.forEach((check, index) => {
                    let statusText;
                    if (check.isHealthy) {
                        statusText = chalk_1.default.green('HEALTHY');
                    }
                    else if (check.error === 'URL not available in record') {
                        statusText = chalk_1.default.gray('NOT_AVAILABLE');
                    }
                    else {
                        statusText = chalk_1.default.red('BROKEN');
                    }
                    const details = check.isHealthy ?
                        `${check.responseTime}ms` :
                        check.error || `HTTP ${check.status}`;
                    table.push([
                        index === 0 ? record.record.Name || 'N/A' : '',
                        index === 0 ? record.record.Id : '',
                        check.urlType.replace('__c', ''),
                        statusText,
                        details
                    ]);
                });
            }
        });
        console.log(table.toString());
    }
    printRecommendations(report) {
        console.log(chalk_1.default.bold.yellow('\n💡 RECOMMENDATIONS'));
        console.log('-'.repeat(50));
        const recommendations = [];
        if (report.brokenRecords > 0) {
            recommendations.push(`🔧 ${report.brokenRecords} record(s) have completely broken URLs - immediate attention required`);
        }
        if (report.partialRecords > 0) {
            recommendations.push(`⚠️  ${report.partialRecords} record(s) have some broken URLs - review and fix broken links`);
        }
        // URL type specific recommendations with granular breakdown
        const urlTypeDisplayNames = {
            'Component_Screenshot_URL__c': 'Component Screenshot URLs',
            'HTML_Source__c': 'HTML Source URLs',
            'Screenshot_URL__c': 'Screenshot URLs'
        };
        Object.entries(report.urlTypeSummary).forEach(([urlType, stats]) => {
            if (stats.broken > 0) {
                const percentage = ((stats.broken / stats.total) * 100).toFixed(1);
                const displayName = urlTypeDisplayNames[urlType] || urlType.replace('__c', '');
                recommendations.push(`📊 ${chalk_1.default.red(`${stats.broken}/${stats.total} ${displayName.toLowerCase()} are broken`)} (${percentage}%)`);
            }
        });
        if (report.totalRecords > 0 && report.healthyRecords === report.totalRecords) {
            recommendations.push(`🎉 All records are healthy! Great job maintaining URL integrity.`);
        }
        if (recommendations.length === 0) {
            recommendations.push(`ℹ️  No specific recommendations - monitoring completed successfully.`);
        }
        recommendations.forEach(rec => console.log(rec));
    }
    printQuickSummary(report) {
        console.log(chalk_1.default.bold.yellow('\n📝 QUICK SUMMARY'));
        console.log('-'.repeat(50));
        const totalURLs = Object.values(report.urlTypeSummary).reduce((sum, stats) => sum + stats.total, 0);
        const totalBroken = Object.values(report.urlTypeSummary).reduce((sum, stats) => sum + stats.broken, 0);
        const totalHealthy = Object.values(report.urlTypeSummary).reduce((sum, stats) => sum + stats.healthy, 0);
        console.log(`📊 Overall URL Health: ${chalk_1.default.green(`${totalHealthy}/${totalURLs} healthy`)} (${((totalHealthy / totalURLs) * 100).toFixed(1)}%)`);
        if (totalBroken > 0) {
            console.log(`❌ Total Broken URLs: ${chalk_1.default.red(totalBroken.toString())} (${((totalBroken / totalURLs) * 100).toFixed(1)}%)`);
            const urlTypeDisplayNames = {
                'Component_Screenshot_URL__c': 'Component Screenshot',
                'HTML_Source__c': 'HTML Source',
                'Screenshot_URL__c': 'Screenshot'
            };
            console.log(`\n${chalk_1.default.bold('Broken by Type:')}`);
            Object.entries(report.urlTypeSummary).forEach(([urlType, stats]) => {
                if (stats.broken > 0) {
                    const displayName = urlTypeDisplayNames[urlType] || urlType.replace('__c', '');
                    console.log(`  • ${chalk_1.default.red(`${stats.broken}/${stats.total}`)} ${displayName} URLs`);
                }
            });
        }
        else {
            console.log(`✅ ${chalk_1.default.green('All URLs are healthy!')}`);
        }
    }
    async generateJSONReport(report, outputPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = outputPath || `aqua-monitoring-report-${timestamp}.json`;
        const reportData = {
            ...report,
            generatedAt: new Date().toISOString(),
            summary: {
                totalURLsChecked: Object.values(report.urlTypeSummary).reduce((sum, stats) => sum + stats.total, 0),
                totalHealthy: Object.values(report.urlTypeSummary).reduce((sum, stats) => sum + stats.healthy, 0),
                totalBroken: Object.values(report.urlTypeSummary).reduce((sum, stats) => sum + stats.broken, 0),
            }
        };
        await promises_1.default.writeFile(filename, JSON.stringify(reportData, null, 2), 'utf8');
        console.log(chalk_1.default.blue(`📄 JSON report saved to: ${filename}`));
        return filename;
    }
    async generateCSVReport(report, outputPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = outputPath || `aqua-monitoring-report-${timestamp}.csv`;
        const csvRows = [];
        csvRows.push('Record Name,Record ID,URL Type,URL Type Display,URL,Status,Error,Response Time (ms),Overall Health');
        const urlTypeDisplayNames = {
            'Component_Screenshot_URL__c': 'Component Screenshot URL',
            'HTML_Source__c': 'HTML Source URL',
            'Screenshot_URL__c': 'Screenshot URL'
        };
        report.detailedResults.forEach(result => {
            if (result.urlChecks.length === 0) {
                csvRows.push(`"${result.record.Name}","${result.record.Id}","No URLs","No URLs","","BROKEN","No URLs found","",${result.overallHealth}`);
            }
            else {
                result.urlChecks.forEach(check => {
                    let status;
                    if (check.isHealthy) {
                        status = 'HEALTHY';
                    }
                    else if (check.error === 'URL not available in record') {
                        status = 'NOT_AVAILABLE';
                    }
                    else {
                        status = 'BROKEN';
                    }
                    const error = check.error || '';
                    const responseTime = check.responseTime || '';
                    const displayName = urlTypeDisplayNames[check.urlType] || check.urlType.replace('__c', '');
                    csvRows.push(`"${result.record.Name}","${result.record.Id}","${check.urlType}","${displayName}","${check.url}","${status}","${error}","${responseTime}","${result.overallHealth}"`);
                });
            }
        });
        await promises_1.default.writeFile(filename, csvRows.join('\n'), 'utf8');
        console.log(chalk_1.default.blue(`📊 CSV report saved to: ${filename}`));
        return filename;
    }
}
exports.Reporter = Reporter;
//# sourceMappingURL=reporter.js.map