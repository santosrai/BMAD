import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { aiModelManager } from '../../services/aiModelManager';
import { AIModelConfig, ModelSwitchOptions } from '../../types/advanced';

interface ModelSwitcherProps {
  currentSessionId: string;
  currentModel: string;
  onModelSwitch: (modelId: string, options: ModelSwitchOptions) => Promise<void>;
  disabled?: boolean;
}

export function ModelSwitcher({ 
  currentSessionId, 
  currentModel, 
  onModelSwitch, 
  disabled = false 
}: ModelSwitcherProps) {
  const [availableModels, setAvailableModels] = useState<AIModelConfig[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [switchOptions, setSwitchOptions] = useState<ModelSwitchOptions>({
    preserveContext: true,
    migrateConversation: true,
    reasonForSwitch: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AIModelConfig[]>([]);

  useEffect(() => {
    const models = aiModelManager.getAvailableModels();
    setAvailableModels(models);
    
    // Get recommendations based on current usage
    const recs = aiModelManager.getModelRecommendations({
      taskType: 'analysis',
      complexityLevel: 'medium',
      budgetConstraint: 'medium',
      performanceRequirement: 'balanced'
    });
    setRecommendations(recs.slice(0, 3));
  }, []);

  const handleModelSwitch = async (modelId: string) => {
    if (modelId === currentModel) return;

    setIsLoading(true);
    try {
      await onModelSwitch(modelId, switchOptions);
    } catch (error) {
      console.error('Model switch failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentModelConfig = () => {
    return availableModels.find(m => m.id === currentModel);
  };

  const getModelBadgeColor = (model: AIModelConfig) => {
    switch (model.provider) {
      case 'anthropic': return 'bg-purple-100 text-purple-800';
      case 'openai': return 'bg-green-100 text-green-800';
      case 'openrouter': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCost = (inputCost: number, outputCost: number) => {
    return `$${inputCost.toFixed(4)}/$${outputCost.toFixed(4)} per 1K tokens`;
  };

  const currentModelConfig = getCurrentModelConfig();

  return (
    <div className="space-y-4">
      {/* Current Model Display */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Current Model</h3>
            {currentModelConfig && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium">{currentModelConfig.displayName}</span>
                <Badge className={getModelBadgeColor(currentModelConfig)}>
                  {currentModelConfig.provider}
                </Badge>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={disabled}
          >
            {showAdvanced ? 'Simple' : 'Advanced'}
          </Button>
        </div>
      </Card>

      {/* Quick Switch - Recommendations */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Recommended Models</h3>
        <div className="grid grid-cols-1 gap-2">
          {recommendations.map(model => (
            <button
              key={model.id}
              onClick={() => handleModelSwitch(model.id)}
              disabled={disabled || isLoading || model.id === currentModel}
              className={`
                p-3 text-left rounded-lg border transition-colors
                ${model.id === currentModel 
                  ? 'bg-blue-50 border-blue-200 cursor-not-allowed' 
                  : 'hover:bg-gray-50 border-gray-200'
                }
                ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.displayName}</span>
                    <Badge className={getModelBadgeColor(model)}>
                      {model.provider}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {formatCost(model.pricing.inputTokens, model.pricing.outputTokens)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {model.limits.maxContextLength.toLocaleString()} tokens
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Advanced Options */}
      {showAdvanced && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Switch Options</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={switchOptions.preserveContext}
                onChange={(e) => setSwitchOptions({
                  ...switchOptions,
                  preserveContext: e.target.checked
                })}
                className="rounded"
              />
              <span className="text-sm">Preserve conversation context</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={switchOptions.migrateConversation}
                onChange={(e) => setSwitchOptions({
                  ...switchOptions,
                  migrateConversation: e.target.checked
                })}
                className="rounded"
              />
              <span className="text-sm">Migrate conversation history</span>
            </label>

            <div>
              <label className="block text-sm font-medium mb-1">
                Reason for switch (optional)
              </label>
              <input
                type="text"
                value={switchOptions.reasonForSwitch}
                onChange={(e) => setSwitchOptions({
                  ...switchOptions,
                  reasonForSwitch: e.target.value
                })}
                placeholder="e.g., Need faster responses, cost optimization"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </Card>
      )}

      {/* All Models List */}
      {showAdvanced && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">All Available Models</h3>
          <div className="space-y-2">
            {availableModels.map(model => (
              <div
                key={model.id}
                className={`
                  p-3 rounded-lg border transition-colors
                  ${model.id === currentModel ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.displayName}</span>
                      <Badge className={getModelBadgeColor(model)}>
                        {model.provider}
                      </Badge>
                      {model.id === currentModel && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-500">
                        Context: {model.limits.maxContextLength.toLocaleString()} tokens
                      </span>
                      <span className="text-xs text-gray-500">
                        Rate: {model.limits.rateLimit}/min
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatCost(model.pricing.inputTokens, model.pricing.outputTokens)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {model.features.streaming && (
                        <Badge variant="outline" className="text-xs">Streaming</Badge>
                      )}
                      {model.features.functionCalling && (
                        <Badge variant="outline" className="text-xs">Functions</Badge>
                      )}
                      {model.features.imageInput && (
                        <Badge variant="outline" className="text-xs">Vision</Badge>
                      )}
                      {model.features.codeGeneration && (
                        <Badge variant="outline" className="text-xs">Code</Badge>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <Button
                      size="sm"
                      variant={model.id === currentModel ? "outline" : "default"}
                      onClick={() => handleModelSwitch(model.id)}
                      disabled={disabled || isLoading || model.id === currentModel}
                    >
                      {isLoading ? 'Switching...' : 
                       model.id === currentModel ? 'Current' : 'Switch'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Model Usage Stats */}
      {showAdvanced && currentSessionId && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Session Usage</h3>
          <div className="text-sm text-gray-600">
            {(() => {
              const stats = aiModelManager.getModelUsageStats(currentSessionId);
              return (
                <div className="space-y-2">
                  <div>Total Messages: {stats.totalMessages}</div>
                  <div>Model Distribution:</div>
                  <div className="ml-4 space-y-1">
                    {Object.entries(stats.modelDistribution).map(([modelId, count]) => (
                      <div key={modelId} className="flex justify-between">
                        <span>{availableModels.find(m => m.id === modelId)?.displayName || modelId}</span>
                        <span>{count} messages</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>
      )}
    </div>
  );
}