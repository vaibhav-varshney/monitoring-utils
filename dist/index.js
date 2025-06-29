#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const salesforce_1 = require("./salesforce");
const monitor_1 = require("./monitor");
const reporter_1 = require("./reporter");
const config_1 = require("./config");
const chalk_1 = __importDefault(require("chalk"));
async function main() {
    console.log(chalk_1.default.bold.blue('🔍 AQUA ViolationGroup URL Monitoring Utility'));
    console.log(chalk_1.default.gray('=========================================\n'));
    try {
        // Validate configuration
        console.log('🔧 Validating configuration...');
        (0, config_1.validateConfig)();
        console.log('✅ Configuration validated successfully\n');
        // Initialize services
        console.log('🔌 Initializing services...');
        const salesforceService = new salesforce_1.SalesforceService(config_1.config.salesforce.loginUrl);
        const monitoringService = new monitor_1.MonitoringService(salesforceService, config_1.config.monitoring);
        const reporter = new reporter_1.Reporter();
        // Connect to Salesforce
        console.log('🔐 Connecting to Salesforce...');
        await salesforceService.login(config_1.config.salesforce.username, config_1.config.salesforce.password);
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
        if (config_1.config.output.generateJSON) {
            await reporter.generateJSONReport(report);
        }
        // CSV report (if enabled)
        if (config_1.config.output.generateCSV) {
            await reporter.generateCSVReport(report);
        }
        // Exit with appropriate code
        const hasIssues = report.brokenRecords > 0 || report.partialRecords > 0;
        if (hasIssues) {
            console.log(chalk_1.default.yellow('\n⚠️  Monitoring completed with issues found'));
            process.exit(1);
        }
        else {
            console.log(chalk_1.default.green('\n✅ Monitoring completed successfully - all URLs are healthy!'));
            process.exit(0);
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('\n❌ Error during monitoring:'));
        console.error(chalk_1.default.red(error.message || String(error)));
        if (error.stack && process.env.NODE_ENV === 'development') {
            console.error(chalk_1.default.gray('\nStack trace:'));
            console.error(chalk_1.default.gray(error.stack));
        }
        process.exit(1);
    }
}
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error(chalk_1.default.red('\n💥 Uncaught Exception:'));
    console.error(chalk_1.default.red(error.message));
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk_1.default.red('\n💥 Unhandled Rejection at:'), promise);
    console.error(chalk_1.default.red('Reason:'), reason);
    process.exit(1);
});
// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log(chalk_1.default.yellow('\n⏹️  Monitoring interrupted by user'));
    process.exit(130);
});
process.on('SIGTERM', () => {
    console.log(chalk_1.default.yellow('\n⏹️  Monitoring terminated'));
    process.exit(143);
});
// Run the main function
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map