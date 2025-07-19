export interface BrowserCapabilities {
  webgl: boolean;
  webgl2: boolean;
  webglVersion: string;
  vendor: string;
  renderer: string;
  maxTextureSize: number;
  maxRenderBufferSize: number;
  supportedExtensions: string[];
  performanceScore: number;
  isSupported: boolean;
  warnings: string[];
}

export const checkBrowserCompatibility = (): BrowserCapabilities => {
  const canvas = document.createElement('canvas');
  const warnings: string[] = [];
  
  // Check WebGL support
  const gl = canvas.getContext('webgl') as WebGLRenderingContext || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
  const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext;
  
  if (!gl) {
    return {
      webgl: false,
      webgl2: false,
      webglVersion: 'Not supported',
      vendor: 'Unknown',
      renderer: 'Unknown',
      maxTextureSize: 0,
      maxRenderBufferSize: 0,
      supportedExtensions: [],
      performanceScore: 0,
      isSupported: false,
      warnings: ['WebGL is not supported in this browser'],
    };
  }

  // Get WebGL info
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';
  const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
  const version = gl.getParameter(gl.VERSION);
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
  
  // Get supported extensions
  const supportedExtensions = gl.getSupportedExtensions() || [];
  
  // Check for important extensions
  const importantExtensions = [
    'OES_texture_float',
    'OES_texture_half_float',
    'WEBGL_depth_texture',
    'OES_element_index_uint',
    'ANGLE_instanced_arrays',
    'EXT_color_buffer_float',
  ];
  
  const missingExtensions = importantExtensions.filter(ext => 
    !supportedExtensions.includes(ext)
  );
  
  if (missingExtensions.length > 0) {
    warnings.push(`Missing recommended extensions: ${missingExtensions.join(', ')}`);
  }
  
  // Performance scoring
  let performanceScore = 0;
  
  // Base score for WebGL support
  performanceScore += 20;
  
  // WebGL 2 support
  if (gl2) {
    performanceScore += 20;
  }
  
  // Texture size scoring
  if (maxTextureSize >= 4096) performanceScore += 10;
  if (maxTextureSize >= 8192) performanceScore += 10;
  if (maxTextureSize >= 16384) performanceScore += 10;
  
  // GPU detection
  const gpuInfo = renderer.toLowerCase();
  if (gpuInfo.includes('nvidia') || gpuInfo.includes('geforce')) {
    performanceScore += 15;
  } else if (gpuInfo.includes('amd') || gpuInfo.includes('radeon')) {
    performanceScore += 12;
  } else if (gpuInfo.includes('intel iris') || gpuInfo.includes('intel plus')) {
    performanceScore += 8;
  } else if (gpuInfo.includes('intel')) {
    performanceScore += 5;
  }
  
  // Extension bonus
  performanceScore += Math.min(supportedExtensions.length, 15);
  
  // Browser-specific checks
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) {
    performanceScore += 5;
  } else if (userAgent.includes('Firefox')) {
    performanceScore += 4;
  } else if (userAgent.includes('Safari')) {
    performanceScore += 3;
  } else if (userAgent.includes('Edge')) {
    performanceScore += 4;
  }
  
  // Browser warnings
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
    warnings.push('Mobile device detected - performance may be limited');
  }
  
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    warnings.push('Safari may have limited WebGL performance');
  }
  
  // Memory warnings
  if (maxTextureSize < 4096) {
    warnings.push('Low texture resolution support - large molecules may not render properly');
  }
  
  // Overall compatibility
  const isSupported = gl && maxTextureSize >= 2048 && supportedExtensions.length > 10;
  
  if (!isSupported) {
    warnings.push('Browser may not fully support Molstar viewer');
  }
  
  return {
    webgl: !!gl,
    webgl2: !!gl2,
    webglVersion: version,
    vendor,
    renderer,
    maxTextureSize,
    maxRenderBufferSize,
    supportedExtensions,
    performanceScore,
    isSupported,
    warnings,
  };
};

export const getRecommendedPerformanceMode = (capabilities: BrowserCapabilities): 'high' | 'medium' | 'low' => {
  if (capabilities.performanceScore >= 80) {
    return 'high';
  } else if (capabilities.performanceScore >= 60) {
    return 'medium';
  } else {
    return 'low';
  }
};

export const generateCompatibilityReport = (capabilities: BrowserCapabilities): string => {
  const lines = [
    'BROWSER COMPATIBILITY REPORT',
    '================================',
    '',
    `WebGL Support: ${capabilities.webgl ? 'Yes' : 'No'}`,
    `WebGL 2 Support: ${capabilities.webgl2 ? 'Yes' : 'No'}`,
    `WebGL Version: ${capabilities.webglVersion}`,
    `Graphics Vendor: ${capabilities.vendor}`,
    `Graphics Renderer: ${capabilities.renderer}`,
    `Max Texture Size: ${capabilities.maxTextureSize}px`,
    `Max Render Buffer Size: ${capabilities.maxRenderBufferSize}px`,
    `Supported Extensions: ${capabilities.supportedExtensions.length}`,
    `Performance Score: ${capabilities.performanceScore}/100`,
    `Overall Compatibility: ${capabilities.isSupported ? 'Supported' : 'Limited'}`,
    '',
    'WARNINGS:',
    ...capabilities.warnings.map(w => `- ${w}`),
    '',
    `Recommended Performance Mode: ${getRecommendedPerformanceMode(capabilities)}`,
  ];
  
  return lines.join('\n');
};

export const shouldShowCompatibilityWarning = (capabilities: BrowserCapabilities): boolean => {
  return !capabilities.isSupported || capabilities.warnings.length > 2;
};

export const getCompatibilityStatus = (capabilities: BrowserCapabilities): 'excellent' | 'good' | 'fair' | 'poor' => {
  if (capabilities.performanceScore >= 90) return 'excellent';
  if (capabilities.performanceScore >= 70) return 'good';
  if (capabilities.performanceScore >= 50) return 'fair';
  return 'poor';
};