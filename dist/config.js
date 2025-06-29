"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.authManager = void 0;
exports.validateConfig = validateConfig;
const dotenv_1 = __importDefault(require("dotenv"));
const auth_manager_1 = require("./auth-manager");
// Load environment variables
dotenv_1.default.config();
// Create a singleton auth manager instance
exports.authManager = new auth_manager_1.AuthManager();
exports.config = {
    // Salesforce Configuration
    salesforce: {
        username: process.env.SF_USERNAME || 'sa11y@salesforce.aquatest.com',
        password: process.env.SF_PASSWORD || 'Test#12345ACVN43pz1R5ohlQJJuYGkNx6e',
        loginUrl: process.env.SF_LOGIN_URL || 'https://gus--aquatest.sandbox.lightning.force.com'
    },
    // Data Store Configuration (now automated via absctl)
    dataStore: {
        // Legacy fallback - if someone still wants to use manual cookies
        cookies: process.env.DATA_STORE_COOKIES || '',
        sessionId: process.env.DATA_STORE_SESSION_ID || '',
        // New: Enable automatic JWT token retrieval
        useAutoAuth: process.env.USE_AUTO_AUTH !== 'false' // Defaults to true, can be disabled
    },
    // Monitoring Configuration
    monitoring: {
        maxConcurrentChecks: parseInt(process.env.MAX_CONCURRENT_CHECKS || '10'),
        requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000'),
        retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '1')
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
    // Check auth configuration
    if (exports.config.dataStore.useAutoAuth && !exports.config.dataStore.cookies) {
        console.log('📡 Auto-authentication enabled - will use absctl to retrieve JWT tokens automatically');
    }
    else if (!exports.config.dataStore.useAutoAuth && !exports.config.dataStore.cookies) {
        console.warn('⚠️  No authentication configured for data store URLs. Set DATA_STORE_COOKIES or enable auto-auth');
    }
    if (errors.length > 0) {
        console.error('❌ Configuration errors:');
        errors.forEach(error => console.error(`   - ${error}`));
        console.error('\nPlease check your .env file or environment variables.');
        process.exit(1);
    }
}
//# sourceMappingURL=config.js.map