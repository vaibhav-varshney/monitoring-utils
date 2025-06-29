#!/usr/bin/env node

import { SalesforceService } from './salesforce';
import { MonitoringService } from './monitor';
import { Reporter } from './reporter';
import { config, validateConfig } from './config';
import chalk from 'chalk';

async function main(): Promise<void> {
  console.log(chalk.bold.blue('🔍 AQUA ViolationGroup URL Monitoring Utility'));
  console.log(chalk.gray('=========================================\n'));

  try {
    // Validate configuration
    console.log('🔧 Validating configuration...');
    validateConfig();
    console.log('✅ Configuration validated successfully\n');

    // Initialize services
    console.log('🔌 Initializing services...');
    const salesforceService = new SalesforceService(config.salesforce.loginUrl);
    const monitoringService = new MonitoringService(salesforceService, config.monitoring);
    const reporter = new Reporter();

    // Connect to Salesforce
    console.log('🔐 Connecting to Salesforce...');
    await salesforceService.login(config.salesforce.username!, config.salesforce.password!);

    // Run monitoring
    console.log('🚀 Starting monitoring process...\n');
    const startTime = Date.now();
    
    const report = await monitoringService.runMonitoring();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n⏱️  Monitoring completed in ${duration} seconds\n`);

    // Generate reports
    console.log('📊 Generating reports...\n');
    
    // Console report (always generated)
    await reporter.generateConsoleReport(report);

    // JSON report (if enabled)
    if (config.output.generateJSON) {
      await reporter.generateJSONReport(report);
    }

    // CSV report (if enabled)
    if (config.output.generateCSV) {
      await reporter.generateCSVReport(report);
    }

    // Exit with appropriate code
    const hasIssues = report.brokenRecords > 0 || report.partialRecords > 0;
    
    if (hasIssues) {
      console.log(chalk.yellow('\n⚠️  Monitoring completed with issues found'));
      process.exit(1);
    } else {
      console.log(chalk.green('\n✅ Monitoring completed successfully - all URLs are healthy!'));
      process.exit(0);
    }

  } catch (error: any) {
    console.error(chalk.red('\n❌ Error during monitoring:'));
    console.error(chalk.red(error.message || String(error)));
    
    if (error.stack && process.env.NODE_ENV === 'development') {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
    
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Uncaught Exception:'));
  console.error(chalk.red(error.message));
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n💥 Unhandled Rejection at:'), promise);
  console.error(chalk.red('Reason:'), reason);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n⏹️  Monitoring interrupted by user'));
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n⏹️  Monitoring terminated'));
  process.exit(143);
});

// Run the main function
if (require.main === module) {
  main();
} 