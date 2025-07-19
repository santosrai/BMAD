import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useRunWorkflow() {
  const runWorkflow = useAction(api.langgraphWorkflow.runWorkflow);
  return async (workflowType: string, parameters: any, apiKey?: string) => {
    return await runWorkflow({ workflowType, parameters, apiKey });
  };
} 