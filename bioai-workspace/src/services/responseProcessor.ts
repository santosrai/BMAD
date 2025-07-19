import { OpenRouterResponse, OpenRouterStreamChunk } from './openrouter';

export interface ProcessedResponse {
  content: string;
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
    confidence: number;
    sources: string[];
    suggestedFollowUps: string[];
  };
  actions: ProcessedAction[];
  structuredData?: {
    molecularData?: any;
    visualizations?: any;
    recommendations?: any;
  };
}

export interface ProcessedAction {
  id: string;
  type: 'search' | 'analyze' | 'visualize' | 'download' | 'recommend';
  description: string;
  data: any;
  priority: 'low' | 'medium' | 'high';
  executable: boolean;
}

export interface StreamingState {
  content: string;
  isComplete: boolean;
  currentChunk: string;
  metadata: Partial<ProcessedResponse['metadata']>;
}

export class ResponseProcessor {
  private molecularKeywords = [
    'protein', 'molecule', 'structure', 'pdb', 'chain', 'residue', 'atom',
    'binding', 'active site', 'enzyme', 'substrate', 'ligand', 'domain',
    'fold', 'secondary structure', 'alpha helix', 'beta sheet', 'loop',
    'crystal structure', 'nmr', 'x-ray', 'cryo-em', 'resolution'
  ];

  private actionPatterns = {
    search: /(?:search|find|look up|query)\s+(?:for\s+)?([^.]+)/gi,
    analyze: /(?:analyze|examine|study|investigate)\s+([^.]+)/gi,
    visualize: /(?:show|display|visualize|render|view)\s+([^.]+)/gi,
    download: /(?:download|save|export|get)\s+([^.]+)/gi,
    recommend: /(?:recommend|suggest|propose)\s+([^.]+)/gi
  };

  async processResponse(response: OpenRouterResponse): Promise<ProcessedResponse> {
    const startTime = Date.now();
    const content = response.choices[0]?.message?.content || '';
    
    // Extract metadata
    const metadata = {
      model: response.model,
      tokensUsed: response.usage?.total_tokens || 0,
      processingTime: Date.now() - startTime,
      confidence: this.calculateConfidence(content),
      sources: this.extractSources(content),
      suggestedFollowUps: this.generateFollowUps(content)
    };

    // Extract actions
    const actions = this.extractActions(content);

    // Extract structured data
    const structuredData = this.extractStructuredData(content);

    return {
      content,
      metadata,
      actions,
      structuredData
    };
  }

  async processStreamingResponse(
    stream: ReadableStream<OpenRouterStreamChunk>,
    onProgress?: (state: StreamingState) => void
  ): Promise<ProcessedResponse> {
    const reader = stream.getReader();
    let fullContent = '';
    let currentChunk = '';
    let model = '';
    let tokensUsed = 0;
    const startTime = Date.now();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = value;
        if (chunk.choices?.[0]?.delta?.content) {
          currentChunk = chunk.choices[0].delta.content;
          fullContent += currentChunk;
          
          if (chunk.model) {
            model = chunk.model;
          }
        }

        // Call progress callback
        if (onProgress) {
          onProgress({
            content: fullContent,
            isComplete: false,
            currentChunk,
            metadata: {
              model,
              tokensUsed,
              processingTime: Date.now() - startTime,
              confidence: this.calculateConfidence(fullContent),
              sources: this.extractSources(fullContent),
              suggestedFollowUps: this.generateFollowUps(fullContent)
            }
          });
        }
      }

      // Process final response
      const metadata = {
        model,
        tokensUsed,
        processingTime: Date.now() - startTime,
        confidence: this.calculateConfidence(fullContent),
        sources: this.extractSources(fullContent),
        suggestedFollowUps: this.generateFollowUps(fullContent)
      };

      const actions = this.extractActions(fullContent);
      const structuredData = this.extractStructuredData(fullContent);

      // Final progress update
      if (onProgress) {
        onProgress({
          content: fullContent,
          isComplete: true,
          currentChunk: '',
          metadata
        });
      }

      return {
        content: fullContent,
        metadata,
        actions,
        structuredData
      };

    } finally {
      reader.releaseLock();
    }
  }

  private calculateConfidence(content: string): number {
    if (!content) return 0;
    
    // Basic confidence scoring based on content characteristics
    let score = 0.5; // Base score

    // Length factor (longer responses generally more confident)
    if (content.length > 100) score += 0.1;
    if (content.length > 500) score += 0.1;

    // Molecular relevance
    const molecularCount = this.molecularKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    ).length;
    score += Math.min(molecularCount * 0.05, 0.2);

    // Structured content (lists, sections)
    if (content.includes('- ') || content.includes('1.')) score += 0.1;
    if (content.includes('##') || content.includes('**')) score += 0.1;

    // Uncertainty indicators (reduce confidence)
    if (content.includes('might') || content.includes('could') || 
        content.includes('possibly') || content.includes('maybe')) {
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  private extractSources(content: string): string[] {
    const sources = [];
    
    // Look for PDB IDs
    const pdbMatches = content.match(/\b[0-9][A-Za-z0-9]{3}\b/g);
    if (pdbMatches) {
      sources.push(...pdbMatches.map(id => `PDB:${id.toUpperCase()}`));
    }

    // Look for DOI patterns
    const doiMatches = content.match(/10\.\d{4,}\/[^\s]+/g);
    if (doiMatches) {
      sources.push(...doiMatches.map(doi => `DOI:${doi}`));
    }

    // Look for UniProt IDs
    const uniprotMatches = content.match(/\b[A-Z][0-9][A-Z0-9]{3}[0-9]\b/g);
    if (uniprotMatches) {
      sources.push(...uniprotMatches.map(id => `UniProt:${id}`));
    }

    return Array.from(new Set(sources)); // Remove duplicates
  }

  private generateFollowUps(content: string): string[] {
    const followUps = [];
    
    // Molecular-specific follow-ups
    if (content.toLowerCase().includes('protein')) {
      followUps.push('Show me the protein structure');
      followUps.push('What are the key binding sites?');
    }

    if (content.toLowerCase().includes('structure')) {
      followUps.push('Load this structure in the viewer');
      followUps.push('Compare with similar structures');
    }

    if (content.toLowerCase().includes('analyze') || content.toLowerCase().includes('analysis')) {
      followUps.push('Provide more detailed analysis');
      followUps.push('What are the implications?');
    }

    // Generic follow-ups
    followUps.push('Tell me more about this');
    followUps.push('What should I do next?');
    followUps.push('Are there any related studies?');

    return followUps.slice(0, 5); // Limit to 5 follow-ups
  }

  private extractActions(content: string): ProcessedAction[] {
    const actions: ProcessedAction[] = [];
    let actionId = 1;

    // Check for different action types
    for (const [actionType, pattern] of Object.entries(this.actionPatterns)) {
      const matches = Array.from(content.matchAll(pattern));
      
      for (const match of matches) {
        const description = match[1]?.trim();
        if (description) {
          actions.push({
            id: `action_${actionId++}`,
            type: actionType as ProcessedAction['type'],
            description,
            data: { query: description, context: actionType },
            priority: this.getActionPriority(actionType, description),
            executable: this.isActionExecutable(actionType, description)
          });
        }
      }
    }

    return actions;
  }

  private extractStructuredData(content: string): ProcessedResponse['structuredData'] {
    const structuredData: ProcessedResponse['structuredData'] = {};

    // Extract molecular data
    const molecularData = this.extractMolecularData(content);
    if (molecularData) {
      structuredData.molecularData = molecularData;
    }

    // Extract visualization suggestions
    const visualizations = this.extractVisualizationSuggestions(content);
    if (visualizations.length > 0) {
      structuredData.visualizations = visualizations;
    }

    // Extract recommendations
    const recommendations = this.extractRecommendations(content);
    if (recommendations.length > 0) {
      structuredData.recommendations = recommendations;
    }

    return Object.keys(structuredData).length > 0 ? structuredData : undefined;
  }

  private extractMolecularData(content: string): any {
    const data: any = {};

    // Extract PDB IDs
    const pdbIds = content.match(/\b[0-9][A-Za-z0-9]{3}\b/g);
    if (pdbIds) {
      data.pdbIds = Array.from(new Set(pdbIds.map(id => id.toUpperCase())));
    }

    // Extract protein names
    const proteinNames = content.match(/\b[A-Z][a-z]+\s+(?:protein|enzyme|kinase|phosphatase|receptor)\b/g);
    if (proteinNames) {
      data.proteins = Array.from(new Set(proteinNames));
    }

    // Extract organisms
    const organisms = content.match(/\b(?:human|mouse|rat|yeast|E\.?\s*coli|Drosophila)\b/gi);
    if (organisms) {
      data.organisms = Array.from(new Set(organisms.map(o => o.toLowerCase())));
    }

    return Object.keys(data).length > 0 ? data : null;
  }

  private extractVisualizationSuggestions(content: string): any[] {
    const suggestions = [];

    if (content.toLowerCase().includes('structure')) {
      suggestions.push({
        type: 'structure',
        description: 'Show molecular structure',
        priority: 'high'
      });
    }

    if (content.toLowerCase().includes('binding site')) {
      suggestions.push({
        type: 'binding_site',
        description: 'Highlight binding sites',
        priority: 'medium'
      });
    }

    if (content.toLowerCase().includes('surface')) {
      suggestions.push({
        type: 'surface',
        description: 'Show molecular surface',
        priority: 'medium'
      });
    }

    return suggestions;
  }

  private extractRecommendations(content: string): any[] {
    const recommendations = [];

    // Look for recommendation patterns
    const recPatterns = [
      /I recommend ([^.]+)/gi,
      /You should ([^.]+)/gi,
      /Consider ([^.]+)/gi,
      /Try ([^.]+)/gi
    ];

    for (const pattern of recPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        recommendations.push({
          text: match[1].trim(),
          confidence: 0.8,
          category: 'general'
        });
      }
    }

    return recommendations;
  }

  private getActionPriority(actionType: string, description: string): ProcessedAction['priority'] {
    // PDB-related actions are high priority
    if (description.toLowerCase().includes('pdb') || 
        description.toLowerCase().includes('structure')) {
      return 'high';
    }

    // Analysis actions are medium priority
    if (actionType === 'analyze' || actionType === 'search') {
      return 'medium';
    }

    return 'low';
  }

  private isActionExecutable(actionType: string, description: string): boolean {
    // Check if we have the capability to execute this action
    const executableTypes = ['search', 'visualize', 'download'];
    
    if (!executableTypes.includes(actionType)) {
      return false;
    }

    // Check for specific patterns that we can handle
    if (actionType === 'search' && 
        (description.toLowerCase().includes('pdb') || 
         description.toLowerCase().includes('protein'))) {
      return true;
    }

    if (actionType === 'visualize' && 
        description.toLowerCase().includes('structure')) {
      return true;
    }

    return false;
  }

  // Utility method to validate response quality
  validateResponse(response: ProcessedResponse): {
    isValid: boolean;
    issues: string[];
    score: number;
  } {
    const issues = [];
    let score = 1.0;

    // Check content length
    if (response.content.length < 10) {
      issues.push('Response too short');
      score -= 0.3;
    }

    // Check confidence
    if (response.metadata.confidence < 0.3) {
      issues.push('Low confidence response');
      score -= 0.2;
    }

    // Check for molecular relevance
    const hasMolecularContent = this.molecularKeywords.some(keyword => 
      response.content.toLowerCase().includes(keyword)
    );
    if (!hasMolecularContent) {
      issues.push('Limited molecular relevance');
      score -= 0.1;
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  }
}