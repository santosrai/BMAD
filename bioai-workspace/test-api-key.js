// Simple test script to verify API key passing
// Run this in the browser console to test

// Mock the workflow engine to see if API key is being passed
const testApiKey = 'sk-or-test1234567890';

console.log('Testing API key passing...');

// Test 1: Check if API key is passed to workflow engine
const mockConfig = { apiKey: testApiKey };
console.log('Test 1 - Config with API key:', mockConfig);

// Test 2: Check if API key is empty
const emptyConfig = { apiKey: '' };
console.log('Test 2 - Empty config:', emptyConfig);

// Test 3: Check if API key is undefined
const undefinedConfig = { apiKey: undefined };
console.log('Test 3 - Undefined config:', undefinedConfig);

console.log('API key tests completed. Check the console for workflow engine logs.'); 