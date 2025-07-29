"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { createPythonWorkflowEngine } from "../src/services/langgraph/pythonWorkflowEngine";

// Track if we've already logged to prevent repeated logs
let hasLogged = false;

export const runWorkflow = action({
  args: {
    workflowType: v.string(),
    parameters: v.any(),
    apiKey: v.optional(v.string()),
    usePythonService: v.optional(v.boolean()),
    pythonServiceUrl: v.optional(v.string()),
  },
  handler: async (_, args) => {
    // Create Python workflow engine (Python service required)
    const config = {
      apiKey: args.apiKey,
      // Check environment variable first, then args, default to false for cloud deployment
      usePythonService: process.env.PYTHON_LANGGRAPH_SERVICE_ENABLED === 'true' ? 
        (args.usePythonService !== false) : false,
      // Use user-provided URL first, then environment variable, then localhost
      pythonServiceUrl: args.pythonServiceUrl || 
        process.env.PYTHON_LANGGRAPH_SERVICE_URL || 
        "http://localhost:8000"
    };

    // Enhanced logging with detailed service routing info
    console.log('🔍 LangGraph Action - Service Routing:', {
      workflowType: args.workflowType,
      usePythonService: config.usePythonService,
      pythonServiceUrl: config.pythonServiceUrl,
      pythonServiceEnabled: process.env.PYTHON_LANGGRAPH_SERVICE_ENABLED,
      hasApiKey: !!args.apiKey,
      apiKeyPreview: args.apiKey ? '***' + args.apiKey.slice(-4) : 'none',
      urlSource: args.pythonServiceUrl ? 'user-configured' : 
                 (process.env.PYTHON_LANGGRAPH_SERVICE_URL ? 'environment' : 'localhost-default')
    });

    const pythonEngine = createPythonWorkflowEngine(config);

    try {
      // Execute workflow with Python service
      console.log('🚀 CALLING PYTHON ENGINE executeWorkflow');
      const result = await pythonEngine.executeWorkflow(
        args.workflowType, 
        args.parameters
      );

      console.log('🔍 RAW PYTHON ENGINE RESULT:', JSON.stringify(result, null, 2));

      // Validate and normalize the result structure
      if (!result || typeof result !== 'object') {
        console.log('❌ INVALID RESULT FROM PYTHON ENGINE:', result);
        throw new Error('Invalid result from Python engine');
      }

      console.log('✅ PYTHON ENGINE RESULT VALID - analyzing structure:', {
        result_keys: Object.keys(result),
        has_response: 'response' in result,
        response_value: result.response,
        response_type: typeof result.response,
        response_length: result.response ? result.response.length : 0
      });

      // Ensure all required fields are present and add service info
      console.log('🔧 NORMALIZING RESULT - before:', {
        'result.response': result.response,
        'result.workflowId': result.workflowId,
        'result.actions': result.actions,
        'result.newContext': result.newContext,
        'result.suggestedFollowUps': result.suggestedFollowUps,
        'result.metadata': result.metadata
      });

      const normalizedResult = {
        workflowId: result.workflowId || `workflow_${Date.now()}`,
        response: result.response || 'Workflow completed',
        actions: Array.isArray(result.actions) ? result.actions : [],
        newContext: result.newContext || {},
        suggestedFollowUps: Array.isArray(result.suggestedFollowUps) ? result.suggestedFollowUps : [],
        metadata: result.metadata && typeof result.metadata === 'object' ? {
          tokensUsed: typeof result.metadata.tokensUsed === 'number' ? result.metadata.tokensUsed : 0,
          duration: typeof result.metadata.duration === 'number' ? result.metadata.duration : 0,
          toolsInvoked: Array.isArray(result.metadata.toolsInvoked) ? result.metadata.toolsInvoked : [],
          confidence: typeof result.metadata.confidence === 'number' ? result.metadata.confidence : 0.5,
          sources: Array.isArray(result.metadata.sources) ? result.metadata.sources : []
        } : {
          tokensUsed: 0,
          duration: 0,
          toolsInvoked: [],
          confidence: 0.5,
          sources: []
        },
        status: result.status || 'completed'
      };

      console.log('📤 FINAL NORMALIZED RESULT:', {
        workflowId: normalizedResult.workflowId,
        response: normalizedResult.response,
        response_length: normalizedResult.response?.length || 0,
        status: normalizedResult.status,
        response_has_python_service_text: normalizedResult.response?.includes('Python LangGraph Service')
      });

      return normalizedResult;

    } catch (error) {
      console.error('Python workflow execution failed:', {
        workflowType: args.workflowType,
        error: error instanceof Error ? error.message : String(error),
        usePythonService: config.usePythonService
      });

      // Return error in AIWorkflowResult format with service routing info
      return {
        workflowId: `error_${Date.now()}`,
        response: error instanceof Error ? 
          `⚠️ Python Service Error: ${error.message}\n\n🔧 Current Configuration:\n• Python Service: ${config.usePythonService ? 'Enabled' : 'Disabled'}\n• Service URL: ${config.pythonServiceUrl}\n\nThe Python service is required for this application to function. Please ensure the Python service is running and accessible.` : 
          'Workflow execution failed - Python service required',
        actions: [],
        newContext: {},
        suggestedFollowUps: [
          'Check if Python service is running at ' + config.pythonServiceUrl,
          'Verify Python service connectivity',
          'Contact support if the issue persists'
        ],
        metadata: {
          tokensUsed: 0,
          duration: 0,
          toolsInvoked: [],
          confidence: 0,
          sources: []
        },
        status: 'failed'
      };
    } finally {
      // Cleanup resources
      await pythonEngine.cleanup();
    }
  },
});

// Health check action for Python service
export const checkPythonServiceHealth = action({
  args: {},
  handler: async () => {
    const pythonEngine = createPythonWorkflowEngine({
      usePythonService: true,
      pythonServiceUrl: process.env.PYTHON_LANGGRAPH_SERVICE_URL || "http://localhost:8000"
    });

    try {
      const healthStatus = pythonEngine.getHealthStatus();
      return {
        pythonService: healthStatus.pythonService,
        lastHealthCheck: healthStatus.lastHealthCheck.toISOString(),
        failureCount: healthStatus.failureCount
      };
    } finally {
      await pythonEngine.cleanup();
    }
  }
}); 