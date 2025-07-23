/**
 * Integration test for Python LangGraph Service with Convex
 * Tests the end-to-end workflow from TypeScript to Python
 */

const { createHybridWorkflowEngine } = require('./bioai-workspace/src/services/langgraph/hybridWorkflowEngine.ts');

async function testIntegration() {
  console.log('🧪 Testing Python-TypeScript Integration...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Python service health check...');
    const pythonServiceUrl = process.env.PYTHON_LANGGRAPH_SERVICE_URL || 'http://localhost:8000';
    
    try {
      const response = await fetch(`${pythonServiceUrl}/health/live`);
      const isHealthy = response.ok;
      console.log(`   Python service (${pythonServiceUrl}): ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      
      if (isHealthy) {
        const data = await response.json();
        console.log(`   Response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.log(`   Python service: ❌ Unreachable (${error.message})`);
      console.log('   This is expected if the Python service is not running');
    }

    console.log('\\n2. Testing hybrid workflow engine...');
    
    // Create hybrid engine instance
    const hybridEngine = createHybridWorkflowEngine({
      usePythonService: true,
      fallbackToTypeScript: true,
      pythonServiceUrl: pythonServiceUrl
    });

    // Test conversation processing workflow
    console.log('   Executing conversation processing workflow...');
    const result = await hybridEngine.executeWorkflow(
      'conversation_processing',
      {
        messages: [
          { role: 'user', content: 'Can you analyze a protein structure for me?' }
        ]
      }
    );

    console.log('   Result:', {
      status: result.status,
      service: result.result?.metadata?.service,
      hasContent: !!result.result?.content,
      executedBy: result.result?.metadata?.executedBy || 'unknown'
    });

    if (result.result?.content) {
      console.log(`   Response preview: ${result.result.content.slice(0, 100)}...`);
    }

    // Cleanup
    await hybridEngine.cleanup();
    
    console.log('\\n✅ Integration test completed successfully!');
    
  } catch (error) {
    console.error('\\n❌ Integration test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Instructions for running the test
console.log('Integration Test Instructions:');
console.log('1. Start the Python service: cd python-langgraph-service && poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000');
console.log('2. Run this test: node integration-test.js');
console.log('3. The test will work with or without the Python service (fallback testing)\\n');

// Run the test if this script is executed directly
if (require.main === module) {
  testIntegration();
}

module.exports = { testIntegration };