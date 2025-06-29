import chalk from 'chalk';
import Table from 'cli-table3';
import fs from 'fs/promises';
import path from 'path';
import { MonitoringReport, ViolationGroupResult, URLCheckResult } from './types';

export class Reporter {
  
  async generateConsoleReport(report: MonitoringReport): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log(chalk.bold.blue('AQUA VIOLATIONGROUP URL MONITORING REPORT'));
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

  private printExecutiveSummary(report: MonitoringReport): void {
    console.log(chalk.bold.yellow('\n📊 EXECUTIVE SUMMARY'));
    console.log('-'.repeat(50));
    
    const table = new Table({
      head: ['Metric', 'Count', 'Percentage'],
      colWidths: [25, 10, 15]
    });

    const healthyPercent = report.totalRecords > 0 ? 
      ((report.healthyRecords / report.totalRecords) * 100).toFixed(1) : '0.0';
    const partialPercent = report.totalRecords > 0 ? 
      ((report.partialRecords / report.totalRecords) * 100).toFixed(1) : '0.0';
    const brokenPercent = report.totalRecords > 0 ? 
      ((report.brokenRecords / report.totalRecords) * 100).toFixed(1) : '0.0';

    table.push(
      ['Total Records', report.totalRecords.toString(), '100.0%'],
      [chalk.green('Healthy Records'), chalk.green(report.healthyRecords.toString()), chalk.green(`${healthyPercent}%`)],
      [chalk.yellow('Partial Records'), chalk.yellow(report.partialRecords.toString()), chalk.yellow(`${partialPercent}%`)],
      [chalk.red('Broken Records'), chalk.red(report.brokenRecords.toString()), chalk.red(`${brokenPercent}%`)]
    );

    console.log(table.toString());
  }

  private printURLTypeSummary(report: MonitoringReport): void {
    console.log(chalk.bold.yellow('\n🔗 URL TYPE SUMMARY'));
    console.log('-'.repeat(50));
    
    const table = new Table({
      head: ['URL Type', 'Total', 'Healthy', 'Broken', 'Health %'],
      colWidths: [30, 8, 10, 10, 12]
    });

    Object.entries(report.urlTypeSummary).forEach(([urlType, stats]) => {
      if (stats.total > 0) {
        const healthPercent = ((stats.healthy / stats.total) * 100).toFixed(1);
        const healthColor = stats.healthy === stats.total ? chalk.green : 
                           stats.healthy === 0 ? chalk.red : chalk.yellow;
        
        table.push([
          urlType.replace('__c', ''),
          stats.total.toString(),
          healthColor(stats.healthy.toString()),
          stats.broken > 0 ? chalk.red(stats.broken.toString()) : '0',
          healthColor(`${healthPercent}%`)
        ]);
      }
    });

    console.log(table.toString());
    
    // Add granular breakdown
    this.printGranularURLBreakdown(report);
  }

  private printGranularURLBreakdown(report: MonitoringReport): void {
    console.log(chalk.bold.yellow('\n📋 GRANULAR URL BREAKDOWN'));
    console.log('-'.repeat(50));
    
    const urlTypeDisplayNames: Record<string, string> = {
      'Component_Screenshot_URL__c': 'Component Screenshot URLs',
      'HTML_Source__c': 'HTML Source URLs', 
      'Screenshot_URL__c': 'Screenshot URLs'
    };

    Object.entries(report.urlTypeSummary).forEach(([urlType, stats]) => {
      if (stats.total > 0) {
        const displayName = urlTypeDisplayNames[urlType] || urlType.replace('__c', '');
        const status = stats.broken === 0 ? '✅' : 
                      stats.healthy === 0 ? '❌' : '⚠️';
        
        console.log(`${status} ${chalk.bold(displayName)}: ${chalk.green(stats.healthy)}/${stats.total} healthy, ${stats.broken > 0 ? chalk.red(`${stats.broken} broken`) : chalk.green('0 broken')}`);
        
        if (stats.broken > 0) {
          const brokenPercent = ((stats.broken / stats.total) * 100).toFixed(1);
          console.log(`   ${chalk.red(`→ ${stats.broken}/${stats.total} ${displayName.toLowerCase()} are broken (${brokenPercent}%)`)}`);
        }
      }
    });
  }

  private printDetailedResults(report: MonitoringReport): void {
    console.log(chalk.bold.yellow('\n📋 DETAILED RESULTS'));
    console.log('-'.repeat(50));

    // Group results by health status
    const brokenRecords = report.detailedResults.filter(r => r.overallHealth === 'broken');
    const partialRecords = report.detailedResults.filter(r => r.overallHealth === 'partial');

    // Show broken records first
    if (brokenRecords.length > 0) {
      console.log(chalk.red.bold(`\n❌ BROKEN RECORDS (${brokenRecords.length})`));
      this.printRecordDetails(brokenRecords, 'broken');
    }

    // Show partial records
    if (partialRecords.length > 0) {
      console.log(chalk.yellow.bold(`\n⚠️  PARTIAL RECORDS (${partialRecords.length})`));
      this.printRecordDetails(partialRecords, 'partial');
    }

    // Summary of healthy records
    const healthyRecords = report.detailedResults.filter(r => r.overallHealth === 'healthy');
    if (healthyRecords.length > 0) {
      console.log(chalk.green.bold(`\n✅ HEALTHY RECORDS (${healthyRecords.length})`));
      console.log(chalk.green('All URLs in these records are functioning correctly.'));
      
      // List healthy record names in a compact format
      const healthyNames = healthyRecords.map(r => r.record.Name).slice(0, 10);
      console.log(chalk.gray(`Examples: ${healthyNames.join(', ')}${healthyRecords.length > 10 ? ` ... and ${healthyRecords.length - 10} more` : ''}`));
    }
  }

  private printRecordDetails(records: ViolationGroupResult[], status: 'broken' | 'partial'): void {
    const table = new Table({
      head: ['Record Name', 'Record ID', 'URL Type', 'Status', 'Error/Response Time'],
      colWidths: [20, 20, 25, 10, 30]
    });

    records.forEach(record => {
      const hasURLs = record.urlChecks.length > 0;
      
      if (!hasURLs) {
        table.push([
          record.record.Name || 'N/A',
          record.record.Id,
          'No URLs found',
          chalk.red('BROKEN'),
          'No URLs to check'
        ]);
      } else {
        record.urlChecks.forEach((check, index) => {
          const statusText = check.isHealthy ? chalk.green('HEALTHY') : chalk.red('BROKEN');
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

  private printRecommendations(report: MonitoringReport): void {
    console.log(chalk.bold.yellow('\n💡 RECOMMENDATIONS'));
    console.log('-'.repeat(50));

    const recommendations: string[] = [];

    if (report.brokenRecords > 0) {
      recommendations.push(`🔧 ${report.brokenRecords} record(s) have completely broken URLs - immediate attention required`);
    }

    if (report.partialRecords > 0) {
      recommendations.push(`⚠️  ${report.partialRecords} record(s) have some broken URLs - review and fix broken links`);
    }

    // URL type specific recommendations with granular breakdown
    const urlTypeDisplayNames: Record<string, string> = {
      'Component_Screenshot_URL__c': 'Component Screenshot URLs',
      'HTML_Source__c': 'HTML Source URLs', 
      'Screenshot_URL__c': 'Screenshot URLs'
    };

    Object.entries(report.urlTypeSummary).forEach(([urlType, stats]) => {
      if (stats.broken > 0) {
        const percentage = ((stats.broken / stats.total) * 100).toFixed(1);
        const displayName = urlTypeDisplayNames[urlType] || urlType.replace('__c', '');
        recommendations.push(`📊 ${chalk.red(`${stats.broken}/${stats.total} ${displayName.toLowerCase()} are broken`)} (${percentage}%)`);
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

  private printQuickSummary(report: MonitoringReport): void {
    console.log(chalk.bold.yellow('\n📝 QUICK SUMMARY'));
    console.log('-'.repeat(50));
    
    const totalURLs = Object.values(report.urlTypeSummary).reduce((sum, stats) => sum + stats.total, 0);
    const totalBroken = Object.values(report.urlTypeSummary).reduce((sum, stats) => sum + stats.broken, 0);
    const totalHealthy = Object.values(report.urlTypeSummary).reduce((sum, stats) => sum + stats.healthy, 0);
    
    console.log(`📊 Overall URL Health: ${chalk.green(`${totalHealthy}/${totalURLs} healthy`)} (${((totalHealthy / totalURLs) * 100).toFixed(1)}%)`);
    
    if (totalBroken > 0) {
      console.log(`❌ Total Broken URLs: ${chalk.red(totalBroken.toString())} (${((totalBroken / totalURLs) * 100).toFixed(1)}%)`);
      
      const urlTypeDisplayNames: Record<string, string> = {
        'Component_Screenshot_URL__c': 'Component Screenshot',
        'HTML_Source__c': 'HTML Source',
        'Screenshot_URL__c': 'Screenshot'
      };
      
      console.log(`\n${chalk.bold('Broken by Type:')}`);
      Object.entries(report.urlTypeSummary).forEach(([urlType, stats]) => {
        if (stats.broken > 0) {
          const displayName = urlTypeDisplayNames[urlType] || urlType.replace('__c', '');
          console.log(`  • ${chalk.red(`${stats.broken}/${stats.total}`)} ${displayName} URLs`);
        }
      });
    } else {
      console.log(`✅ ${chalk.green('All URLs are healthy!')}`);
    }
  }

  async generateJSONReport(report: MonitoringReport, outputPath?: string): Promise<string> {
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

    await fs.writeFile(filename, JSON.stringify(reportData, null, 2), 'utf8');
    console.log(chalk.blue(`📄 JSON report saved to: ${filename}`));
    
    return filename;
  }

  async generateCSVReport(report: MonitoringReport, outputPath?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = outputPath || `aqua-monitoring-report-${timestamp}.csv`;
    
    const csvRows: string[] = [];
    csvRows.push('Record Name,Record ID,URL Type,URL Type Display,URL,Status,Error,Response Time (ms),Overall Health');

    const urlTypeDisplayNames: Record<string, string> = {
      'Component_Screenshot_URL__c': 'Component Screenshot URL',
      'HTML_Source__c': 'HTML Source URL',
      'Screenshot_URL__c': 'Screenshot URL'
    };

    report.detailedResults.forEach(result => {
      if (result.urlChecks.length === 0) {
        csvRows.push(`"${result.record.Name}","${result.record.Id}","No URLs","No URLs","","BROKEN","No URLs found","",${result.overallHealth}`);
      } else {
        result.urlChecks.forEach(check => {
          const status = check.isHealthy ? 'HEALTHY' : 'BROKEN';
          const error = check.error || '';
          const responseTime = check.responseTime || '';
          const displayName = urlTypeDisplayNames[check.urlType] || check.urlType.replace('__c', '');
          
          csvRows.push(`"${result.record.Name}","${result.record.Id}","${check.urlType}","${displayName}","${check.url}","${status}","${error}","${responseTime}","${result.overallHealth}"`);
        });
      }
    });

    await fs.writeFile(filename, csvRows.join('\n'), 'utf8');
    console.log(chalk.blue(`📊 CSV report saved to: ${filename}`));
    
    return filename;
  }
} 