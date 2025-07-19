"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { getWorkflowEngine } from "../src/services/langgraph/workflowEngine";

export const runWorkflow = action({
  args: {
    workflowType: v.string(),
    parameters: v.any(),
    apiKey: v.optional(v.string()),
  },
  handler: async (_, args) => {
    // Create workflow engine with user's API key if provided
    const config = args.apiKey ? { apiKey: args.apiKey } : undefined;
    console.log('LangGraph Action: Received API key:', args.apiKey ? '***' + args.apiKey.slice(-4) : 'none');
    console.log('LangGraph Action: Config:', config);
    const engine = getWorkflowEngine(config);
    const result = await engine.executeWorkflow(args.workflowType, args.parameters);
    return result;
  },
}); 