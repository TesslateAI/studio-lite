// Test script to verify deployment system
const { db } = require('./lib/db/queries');
const { deployments } = require('./lib/db/schema');

async function testDeploymentTable() {
  try {
    console.log('Testing deployments table...');
    
    // Try to query the deployments table
    const result = await db.select().from(deployments).limit(1);
    
    console.log('✅ Deployments table exists and is accessible!');
    console.log('Current deployments count:', result.length);
    
    return true;
  } catch (error) {
    console.error('❌ Error accessing deployments table:', error.message);
    return false;
  }
}

testDeploymentTable().then(() => process.exit(0));