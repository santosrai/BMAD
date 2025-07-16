import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { validateApiKeyConnectivity } from "../services/openrouter";
import { useState, useCallback } from "react";

export function useApiKey() {
  const apiKeyInfo = useQuery(api.apiKeys.getApiKey);
  const setApiKeyMutation = useMutation(api.apiKeys.setApiKey);
  const updateStatusMutation = useMutation(api.apiKeys.updateApiKeyStatus);
  const removeApiKeyMutation = useMutation(api.apiKeys.removeApiKey);
  
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Set API key with validation
  const setApiKey = useCallback(async (apiKey: string) => {
    try {
      setValidationError(null);
      
      // Save the API key first
      await setApiKeyMutation({ apiKey });
      
      // Then validate it
      setIsValidating(true);
      const validationResult = await validateApiKeyConnectivity(apiKey);
      
      // Update the validation status
      await updateStatusMutation({
        status: validationResult.isValid ? 'valid' : 'invalid',
        errorMessage: validationResult.error,
      });

      if (!validationResult.isValid) {
        setValidationError(validationResult.error || 'Validation failed');
      }

      return validationResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save API key';
      setValidationError(errorMessage);
      throw error;
    } finally {
      setIsValidating(false);
    }
  }, [setApiKeyMutation, updateStatusMutation]);

  // Validate existing API key (Note: For security, this requires the key to be re-entered)
  const validateApiKey = useCallback(async (apiKey?: string) => {
    if (!apiKey && !apiKeyInfo?.hasApiKey) {
      throw new Error('No API key found');
    }

    try {
      setIsValidating(true);
      setValidationError(null);

      if (!apiKey) {
        // If no API key provided, we can't validate the stored one directly for security reasons
        setValidationError('Please re-enter your API key to validate connectivity');
        return { isValid: false, error: 'API key required for validation' };
      }

      const validationResult = await validateApiKeyConnectivity(apiKey);

      // Update the validation status
      await updateStatusMutation({
        status: validationResult.isValid ? 'valid' : 'invalid',
        errorMessage: validationResult.error,
      });

      if (!validationResult.isValid) {
        setValidationError(validationResult.error || 'Validation failed');
      }

      return validationResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      setValidationError(errorMessage);
      throw error;
    } finally {
      setIsValidating(false);
    }
  }, [apiKeyInfo?.hasApiKey, updateStatusMutation]);

  // Remove API key
  const removeApiKey = useCallback(async () => {
    try {
      setValidationError(null);
      await removeApiKeyMutation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove API key';
      setValidationError(errorMessage);
      throw error;
    }
  }, [removeApiKeyMutation]);

  return {
    apiKeyInfo,
    isValidating,
    validationError,
    setApiKey,
    validateApiKey,
    removeApiKey,
    clearValidationError: () => setValidationError(null),
  };
}