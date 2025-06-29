#!/usr/bin/env ts-node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function preMonitorSetup() {
  console.log('🚀 Preparing to run AQUA ViolationGroup URL Monitoring...');
  console.log('=======================================================\n');

  try {
    // Step 1: Check if absctl is available
    console.log('🔍 Checking absctl availability...');
    try {
      await execAsync('which absctl');
      console.log('✅ absctl is available');
    } catch {
      console.log('⚠️  absctl not found - skipping authentication check');
      console.log('💡 HTML_Source__c URLs will not be accessible without absctl');
      return;
    }

    // Step 2: Check if already authenticated
    console.log('🔐 Checking authentication status...');
    try {
      const { stdout } = await execAsync('absctl auth:login --show', { timeout: 10000 });
      if (stdout && stdout.trim()) {
        console.log('✅ Already authenticated with absctl');
        console.log('🎯 JWT token is available');
        return;
      }
    } catch (error: any) {
      // If --show fails, we probably need to authenticate
      console.log('🔄 Authentication required');
    }

    // Step 3: Attempt to authenticate
    console.log('🔑 Running absctl auth:login...');
    console.log('💡 Please follow the authentication prompts if any appear\n');
    
    try {
      // Run the login command - this might be interactive
      await execAsync('absctl auth:login', { 
        timeout: 120000 // 2 minutes timeout for interactive login
      });
      
      console.log('\n✅ Authentication completed successfully');
      
      // Verify authentication worked
      try {
        const { stdout } = await execAsync('absctl auth:login --show', { timeout: 10000 });
        if (stdout && stdout.trim()) {
          console.log('🎯 JWT token verified and ready');
        } else {
          console.log('⚠️  Authentication may not have completed properly');
        }
      } catch {
        console.log('⚠️  Could not verify authentication status');
      }
      
    } catch (authError: any) {
      console.error('❌ Authentication failed:', authError.message);
      console.error('💡 You can either:');
      console.error('   1. Run "absctl auth:login" manually before running the monitor');
      console.error('   2. Disable auto-auth by setting USE_AUTO_AUTH=false in .env');
      console.error('   3. Configure manual DATA_STORE_COOKIES in .env');
      console.error('\n⚠️  Continuing anyway - HTML_Source__c URLs may not work');
    }

  } catch (error) {
    console.error('❌ Pre-monitor setup failed:', error);
    console.error('⚠️  Continuing anyway...');
  }

  console.log('\n🎬 Starting monitoring utility...');
  console.log('=====================================\n');
}

// Run the setup if this file is executed directly
if (require.main === module) {
  preMonitorSetup().catch(error => {
    console.error('Pre-monitor setup execution failed:', error);
    // Don't exit with error - let the monitor run anyway
  });
}

export { preMonitorSetup }; 