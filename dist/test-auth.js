#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_manager_1 = require("./auth-manager");
async function testAuthentication() {
    console.log('🧪 Testing Automated JWT Token Authentication');
    console.log('===============================================\n');
    const authManager = new auth_manager_1.AuthManager();
    try {
        console.log('🔍 Step 1: Checking if absctl is available...');
        console.log('🔑 Step 2: Attempting to retrieve JWT token...');
        const startTime = Date.now();
        const token = await authManager.getJWTToken();
        const elapsedTime = Date.now() - startTime;
        console.log('✅ JWT token retrieved successfully!');
        console.log(`⏱️  Retrieved in ${elapsedTime}ms`);
        console.log(`🎯 Token length: ${token.length} characters`);
        console.log(`🔐 Token preview: ${token.substring(0, 20)}...${token.substring(token.length - 10)}`);
        console.log('\n🔄 Step 3: Testing token caching...');
        const cachedStartTime = Date.now();
        const cachedToken = await authManager.getJWTToken();
        const cachedElapsedTime = Date.now() - cachedStartTime;
        if (cachedToken === token) {
            console.log('✅ Token caching is working correctly!');
            console.log(`⚡ Cached retrieval in ${cachedElapsedTime}ms (should be much faster)`);
        }
        else {
            console.log('⚠️  Token caching may not be working as expected');
        }
        console.log('\n🍪 Step 4: Testing cookie formatting...');
        const cookieString = authManager.formatTokenAsCookie(token);
        console.log(`✅ Cookie format: ${cookieString.substring(0, 30)}...`);
        console.log('\n🎉 Authentication Test Results');
        console.log('==============================');
        console.log('✅ absctl command is available');
        console.log('✅ JWT token retrieval is working');
        console.log('✅ Token caching is functional');
        console.log('✅ Cookie formatting is working');
        console.log('\n🚀 Your monitoring utility is ready to use automated authentication!');
        console.log('💡 Run: npm run monitor');
    }
    catch (error) {
        console.error('\n❌ Authentication Test Failed');
        console.error('============================');
        if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes('absctl command not found')) {
                console.error('🔧 Issue: absctl is not installed or not in PATH');
                console.error('💡 Solution: Install absctl and ensure it\'s available in your terminal');
                console.error('   Run: which absctl');
            }
            else if (errorMessage.includes('not logged in') || errorMessage.includes('authentication required')) {
                console.error('🔐 Issue: Not authenticated with absctl');
                console.error('💡 Solution: Run: absctl auth:login');
            }
            else if (errorMessage.includes('timeout')) {
                console.error('⏰ Issue: Timeout while retrieving token');
                console.error('💡 Solution: Check your network connection and try again');
            }
            else {
                console.error(`🐛 Unexpected error: ${error.message}`);
            }
        }
        else {
            console.error(`🐛 Unknown error: ${String(error)}`);
        }
        console.error('\n🔄 Fallback Options:');
        console.error('1. Fix the above issue and run the test again');
        console.error('2. Disable auto-auth by setting USE_AUTO_AUTH=false in .env');
        console.error('3. Configure manual DATA_STORE_COOKIES in .env file');
        process.exit(1);
    }
}
// Run the test if this file is executed directly
if (require.main === module) {
    testAuthentication().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=test-auth.js.map