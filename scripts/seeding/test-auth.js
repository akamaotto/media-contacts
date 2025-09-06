/**
 * Simple test script to verify authentication with the API
 */

const { spawn } = require('child_process');

console.log('Testing API authentication...');

// Try to make a simple request to see if we can get a response
async function testApi() {
  try {
    // First, let's try to get regions without authentication
    console.log('Testing unauthenticated request to /api/regions...');
    const response = await fetch('http://localhost:3000/api/regions');
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testApi().catch(console.error);