"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
exports.config = {
    // Salesforce Configuration
    salesforce: {
        username: process.env.SF_USERNAME || 'sa11y@salesforce.aquatest.com',
        password: process.env.SF_PASSWORD || 'Test#12345ACVN43pz1R5ohlQJJuYGkNx6e',
        loginUrl: process.env.SF_LOGIN_URL || 'https://gus--aquatest.sandbox.lightning.force.com'
    },
    // Data Store Configuration (for absctl/HTML_Source__c URLs)
    dataStore: {
        cookies: process.env.DATA_STORE_COOKIES || '', // Manual cookie string
        sessionId: process.env.DATA_STORE_SESSION_ID || '' // Alternative: just session ID
    },
    // Monitoring Configuration
    monitoring: {
        maxConcurrentChecks: parseInt(process.env.MAX_CONCURRENT_CHECKS || '10'),
        requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000'),
        retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3')
    },
    // Output Configuration
    output: {
        generateJSON: process.env.GENERATE_JSON !== 'false',
        generateCSV: process.env.GENERATE_CSV !== 'false',
        outputDir: process.env.OUTPUT_DIR || process.cwd()
    }
};
function validateConfig() {
    const errors = [];
    if (!exports.config.salesforce.username) {
        errors.push('SF_USERNAME environment variable is required');
    }
    if (!exports.config.salesforce.password) {
        errors.push('SF_PASSWORD environment variable is required');
    }
    if (!exports.config.salesforce.loginUrl) {
        errors.push('SF_LOGIN_URL environment variable is required');
    }
    if (exports.config.monitoring.maxConcurrentChecks <= 0) {
        errors.push('MAX_CONCURRENT_CHECKS must be a positive number');
    }
    if (exports.config.monitoring.requestTimeoutMs <= 0) {
        errors.push('REQUEST_TIMEOUT_MS must be a positive number');
    }
    if (exports.config.monitoring.retryAttempts < 0) {
        errors.push('RETRY_ATTEMPTS must be a non-negative number');
    }
    if (errors.length > 0) {
        console.error('❌ Configuration errors:');
        errors.forEach(error => console.error(`   - ${error}`));
        console.error('\nPlease check your .env file or environment variables.');
        process.exit(1);
    }
}
//# sourceMappingURL=config.js.map