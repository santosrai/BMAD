import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useRunWorkflow() {
  const runWorkflow = useAction(api.langgraphWorkflow.runWorkflow);
  return async (workflowType: string, parameters: any, apiKey?: string) => {
    // Get user-configured backend URL from localStorage if available
    const userBackendUrl = typeof window !== 'undefined' ? 
      localStorage.getItem('bioai_backend_url') : null;
    
    return await runWorkflow({ 
      workflowType, 
      parameters, 
      apiKey,
      pythonServiceUrl: userBackendUrl || undefined // Pass the user-configured URL
    });
  };
} 