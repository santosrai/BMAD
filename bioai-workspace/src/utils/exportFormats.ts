import { ExportFormat, EXPORT_FORMATS } from '../types/export';

export class PDBFormatter {
  static format(pdbData: string, options: {
    includeSelections?: boolean;
    includeModifications?: boolean;
    includeWaterMolecules?: boolean;
    includeHydrogens?: boolean;
    includeMetadata?: boolean;
  }): string {
    let formatted = pdbData;
    
    if (!options.includeWaterMolecules) {
      formatted = this.removeWaterMolecules(formatted);
    }
    
    if (!options.includeHydrogens) {
      formatted = this.removeHydrogens(formatted);
    }
    
    if (options.includeMetadata) {
      formatted = this.addMetadata(formatted);
    }
    
    return formatted;
  }
  
  static validate(pdbData: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = pdbData.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
        if (line.length < 80) {
          errors.push(`Line ${i + 1}: Invalid PDB record length`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  private static removeWaterMolecules(pdbData: string): string {
    return pdbData
      .split('\n')
      .filter(line => !line.includes('HOH') && !line.includes('WAT'))
      .join('\n');
  }
  
  private static removeHydrogens(pdbData: string): string {
    return pdbData
      .split('\n')
      .filter(line => {
        if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
          const element = line.substr(76, 2).trim();
          return element !== 'H';
        }
        return true;
      })
      .join('\n');
  }
  
  private static addMetadata(pdbData: string): string {
    const timestamp = new Date().toISOString();
    const header = `REMARK   1 EXPORTED FROM BIOAI WORKSPACE
REMARK   1 EXPORT TIMESTAMP: ${timestamp}
REMARK   1 REFERENCE: https://bioai-workspace.com
`;
    return header + pdbData;
  }
}

export class ImageFormatter {
  static async formatCanvas(
    canvas: HTMLCanvasElement,
    options: {
      format: ExportFormat;
      width?: number;
      height?: number;
      quality?: 'low' | 'medium' | 'high' | 'ultra';
      backgroundColor?: string;
      transparent?: boolean;
    }
  ): Promise<Blob> {
    const targetCanvas = document.createElement('canvas');
    const ctx = targetCanvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    targetCanvas.width = options.width || canvas.width;
    targetCanvas.height = options.height || canvas.height;
    
    if (options.backgroundColor && !options.transparent) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    }
    
    ctx.drawImage(canvas, 0, 0, targetCanvas.width, targetCanvas.height);
    
    return new Promise((resolve, reject) => {
      const quality = this.getQualityValue(options.quality || 'medium');
      
      targetCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate image blob'));
          }
        },
        options.format.mimeType,
        quality
      );
    });
  }
  
  static async formatSVG(
    svgElement: SVGElement,
    options: {
      width?: number;
      height?: number;
      includeStyles?: boolean;
    }
  ): Promise<string> {
    const svg = svgElement.cloneNode(true) as SVGElement;
    
    if (options.width) {
      svg.setAttribute('width', options.width.toString());
    }
    
    if (options.height) {
      svg.setAttribute('height', options.height.toString());
    }
    
    if (options.includeStyles) {
      const styles = this.extractStyles();
      const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleElement.textContent = styles;
      svg.insertBefore(styleElement, svg.firstChild);
    }
    
    return new XMLSerializer().serializeToString(svg);
  }
  
  private static getQualityValue(quality: string): number {
    switch (quality) {
      case 'low': return 0.5;
      case 'medium': return 0.7;
      case 'high': return 0.9;
      case 'ultra': return 1.0;
      default: return 0.7;
    }
  }
  
  private static extractStyles(): string {
    const styles: string[] = [];
    
    for (const styleSheet of document.styleSheets) {
      try {
        const rules = styleSheet.cssRules || styleSheet.rules;
        for (const rule of rules) {
          styles.push(rule.cssText);
        }
      } catch (e) {
        console.warn('Could not access stylesheet:', e);
      }
    }
    
    return styles.join('\n');
  }
}

export class ConversationFormatter {
  static formatAsJSON(
    messages: any[],
    options: {
      includeAIResponses?: boolean;
      includeMolecularContext?: boolean;
      includeUserMessages?: boolean;
      includeTimestamps?: boolean;
    }
  ): string {
    let filteredMessages = messages;
    
    if (!options.includeAIResponses) {
      filteredMessages = filteredMessages.filter(msg => msg.role !== 'assistant');
    }
    
    if (!options.includeUserMessages) {
      filteredMessages = filteredMessages.filter(msg => msg.role !== 'user');
    }
    
    if (!options.includeMolecularContext) {
      filteredMessages = filteredMessages.map(msg => ({
        ...msg,
        molecularContext: undefined
      }));
    }
    
    if (!options.includeTimestamps) {
      filteredMessages = filteredMessages.map(msg => ({
        ...msg,
        timestamp: undefined
      }));
    }
    
    return JSON.stringify(filteredMessages, null, 2);
  }
  
  static formatAsCSV(
    messages: any[],
    options: {
      includeAIResponses?: boolean;
      includeMolecularContext?: boolean;
      includeUserMessages?: boolean;
      includeTimestamps?: boolean;
    }
  ): string {
    let filteredMessages = messages;
    
    if (!options.includeAIResponses) {
      filteredMessages = filteredMessages.filter(msg => msg.role !== 'assistant');
    }
    
    if (!options.includeUserMessages) {
      filteredMessages = filteredMessages.filter(msg => msg.role !== 'user');
    }
    
    if (filteredMessages.length === 0) {
      return '';
    }
    
    const headers = ['role', 'content'];
    
    if (options.includeTimestamps) {
      headers.push('timestamp');
    }
    
    if (options.includeMolecularContext) {
      headers.push('molecularContext');
    }
    
    const csvRows = [headers.join(',')];
    
    for (const message of filteredMessages) {
      const row = [
        message.role,
        `"${message.content.replace(/"/g, '""')}"`
      ];
      
      if (options.includeTimestamps) {
        row.push(message.timestamp || '');
      }
      
      if (options.includeMolecularContext) {
        row.push(message.molecularContext ? `"${JSON.stringify(message.molecularContext).replace(/"/g, '""')}"` : '');
      }
      
      csvRows.push(row.join(','));
    }
    
    return csvRows.join('\n');
  }
  
  static formatAsText(
    messages: any[],
    options: {
      includeAIResponses?: boolean;
      includeMolecularContext?: boolean;
      includeUserMessages?: boolean;
      includeTimestamps?: boolean;
    }
  ): string {
    let filteredMessages = messages;
    
    if (!options.includeAIResponses) {
      filteredMessages = filteredMessages.filter(msg => msg.role !== 'assistant');
    }
    
    if (!options.includeUserMessages) {
      filteredMessages = filteredMessages.filter(msg => msg.role !== 'user');
    }
    
    const formatted = filteredMessages.map(message => {
      let output = `${message.role.toUpperCase()}: ${message.content}`;
      
      if (options.includeTimestamps && message.timestamp) {
        output += `\nTimestamp: ${new Date(message.timestamp).toLocaleString()}`;
      }
      
      if (options.includeMolecularContext && message.molecularContext) {
        output += `\nMolecular Context: ${JSON.stringify(message.molecularContext, null, 2)}`;
      }
      
      return output;
    });
    
    return formatted.join('\n\n---\n\n');
  }
}

export class BatchFormatter {
  static async createZipArchive(
    files: Array<{ name: string; content: string | Blob }>,
    options: {
      compression?: 'none' | 'fast' | 'best';
      includeManifest?: boolean;
    }
  ): Promise<Blob> {
    const JSZip = await import('jszip');
    const zip = new JSZip.default();
    
    for (const file of files) {
      if (typeof file.content === 'string') {
        zip.file(file.name, file.content);
      } else {
        zip.file(file.name, file.content);
      }
    }
    
    if (options.includeManifest) {
      const manifest = this.createManifest(files);
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    }
    
    const compressionLevel = this.getCompressionLevel(options.compression || 'fast');
    
    return zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: compressionLevel
      }
    });
  }
  
  private static createManifest(files: Array<{ name: string; content: string | Blob }>) {
    return {
      generatedAt: new Date().toISOString(),
      files: files.map(file => ({
        name: file.name,
        size: typeof file.content === 'string' ? file.content.length : file.content.size,
        type: typeof file.content === 'string' ? 'text' : 'binary'
      })),
      totalFiles: files.length,
      source: 'BioAI Workspace'
    };
  }
  
  private static getCompressionLevel(compression: string): number {
    switch (compression) {
      case 'none': return 0;
      case 'fast': return 1;
      case 'best': return 9;
      default: return 6;
    }
  }
}

export const exportFormats = {
  PDB: PDBFormatter,
  Image: ImageFormatter,
  Conversation: ConversationFormatter,
  Batch: BatchFormatter
};

export function getExportFormat(formatName: string): ExportFormat {
  const format = EXPORT_FORMATS[formatName as keyof typeof EXPORT_FORMATS];
  if (!format) {
    throw new Error(`Unsupported export format: ${formatName}`);
  }
  return format;
}

export function getDefaultExportSettings(formatName: string) {
  const format = getExportFormat(formatName);
  
  return {
    format,
    quality: 'medium' as const,
    includeMetadata: true,
    includeTimestamps: true
  };
}