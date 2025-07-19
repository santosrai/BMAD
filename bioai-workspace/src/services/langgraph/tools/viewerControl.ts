// Viewer Control Tool for LangGraph Integration
// Provides AI-driven molecular viewer manipulation capabilities

import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Input schema for viewer control
const ViewerControlSchema = z.object({
  action: z.enum([
    "load", "zoom", "rotate", "highlight", "select", "center", 
    "representation", "color", "reset", "save", "animation"
  ]).describe("Action to perform on the molecular viewer"),
  
  parameters: z.object({
    structureUrl: z.string().optional().describe("URL or PDB ID for loading structures"),
    pdbId: z.string().optional().describe("PDB ID for structure loading"),
    
    // Selection parameters
    residues: z.array(z.number()).optional().describe("Residue numbers to select"),
    chains: z.array(z.string()).optional().describe("Chain IDs to select"),
    atoms: z.array(z.string()).optional().describe("Atom names to select"),
    
    // Zoom/camera parameters
    zoomFactor: z.number().optional().describe("Zoom factor (0.1 to 10)"),
    center: z.array(z.number()).optional().describe("Center coordinates [x, y, z]"),
    
    // Rotation parameters
    axis: z.enum(["x", "y", "z"]).optional().describe("Rotation axis"),
    angle: z.number().optional().describe("Rotation angle in degrees"),
    
    // Representation parameters
    style: z.enum([
      "cartoon", "ribbon", "surface", "ball-and-stick", "space-filling",
      "wireframe", "backbone", "putty", "gaussian"
    ]).optional().describe("Representation style"),
    
    // Color parameters
    colorScheme: z.enum([
      "element", "chain", "residue", "bfactor", "occupancy", 
      "rainbow", "spectrum", "hydrophobicity", "charge"
    ]).optional().describe("Color scheme to apply"),
    
    // Animation parameters
    duration: z.number().optional().describe("Animation duration in milliseconds"),
    
    // Highlight parameters
    highlightColor: z.string().optional().describe("Highlight color (hex or named)"),
    
    // General parameters
    opacity: z.number().optional().describe("Opacity value (0 to 1)"),
    quality: z.enum(["low", "medium", "high"]).optional().describe("Rendering quality")
  }).optional().describe("Action-specific parameters")
});

export const ViewerControlTool = tool(
  async ({ action, parameters = {} }) => {
    const startTime = Date.now();
    
    try {
      let result: any;
      
      switch (action) {
        case "load":
          result = await handleLoadAction(parameters);
          break;
        case "zoom":
          result = await handleZoomAction(parameters);
          break;
        case "rotate":
          result = await handleRotateAction(parameters);
          break;
        case "highlight":
          result = await handleHighlightAction(parameters);
          break;
        case "select":
          result = await handleSelectAction(parameters);
          break;
        case "center":
          result = await handleCenterAction(parameters);
          break;
        case "representation":
          result = await handleRepresentationAction(parameters);
          break;
        case "color":
          result = await handleColorAction(parameters);
          break;
        case "reset":
          result = await handleResetAction(parameters);
          break;
        case "save":
          result = await handleSaveAction(parameters);
          break;
        case "animation":
          result = await handleAnimationAction(parameters);
          break;
        default:
          throw new Error(`Unsupported viewer action: ${action}`);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        action,
        result,
        duration,
        message: generateActionMessage(action, result),
        nextSuggestions: generateActionSuggestions(action, result)
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown viewer error";
      
      return {
        success: false,
        action,
        error: errorMessage,
        duration,
        message: `Failed to ${action}: ${errorMessage}`,
        suggestions: ["Check if structure is loaded", "Verify parameters", "Try a different approach"]
      };
    }
  },
  {
    name: "viewer_control",
    description: "Control molecular viewer display, interactions, and visual representations",
    schema: ViewerControlSchema
  }
);

// Action handler implementations
async function handleLoadAction(params: any): Promise<any> {
  const structureId = params.pdbId || params.structureUrl;
  
  if (!structureId) {
    throw new Error("Structure ID or URL required for loading");
  }

  // Mock loading implementation
  return {
    loaded: true,
    structureId,
    structureInfo: {
      pdbId: structureId,
      title: "Mock Protein Structure",
      resolution: 2.1,
      chains: ["A", "B"],
      residueCount: 324,
      atomCount: 2456
    },
    loadTime: 1234,
    viewerState: {
      center: [0, 0, 0],
      zoom: 1.0,
      rotation: [0, 0, 0]
    }
  };
}

async function handleZoomAction(params: any): Promise<any> {
  const zoomFactor = params.zoomFactor || 1.2;
  
  if (zoomFactor < 0.1 || zoomFactor > 10) {
    throw new Error("Zoom factor must be between 0.1 and 10");
  }

  return {
    zoomApplied: true,
    previousZoom: 1.0,
    newZoom: zoomFactor,
    center: params.center || [0, 0, 0]
  };
}

async function handleRotateAction(params: any): Promise<any> {
  const axis = params.axis || "y";
  const angle = params.angle || 90;
  
  return {
    rotationApplied: true,
    axis,
    angle,
    newRotation: [
      axis === "x" ? angle : 0,
      axis === "y" ? angle : 0,
      axis === "z" ? angle : 0
    ]
  };
}

async function handleHighlightAction(params: any): Promise<any> {
  const targets = {
    residues: params.residues || [],
    chains: params.chains || [],
    atoms: params.atoms || []
  };
  
  const color = params.highlightColor || "#ff0000";
  
  return {
    highlighted: true,
    targets,
    color,
    highlightedCount: 
      (targets.residues?.length || 0) + 
      (targets.chains?.length || 0) + 
      (targets.atoms?.length || 0)
  };
}

async function handleSelectAction(params: any): Promise<any> {
  const selection = {
    residues: params.residues || [],
    chains: params.chains || [],
    atoms: params.atoms || []
  };
  
  const selectedCount = 
    (selection.residues?.length || 0) + 
    (selection.chains?.length || 0) + 
    (selection.atoms?.length || 0);
  
  return {
    selected: true,
    selection,
    selectedCount,
    selectionInfo: {
      residueRange: selection.residues?.length > 0 ? 
        `${Math.min(...selection.residues)}-${Math.max(...selection.residues)}` : null,
      chains: selection.chains,
      atomTypes: selection.atoms
    }
  };
}

async function handleCenterAction(params: any): Promise<any> {
  const center = params.center || [0, 0, 0];
  
  return {
    centered: true,
    newCenter: center,
    targets: {
      residues: params.residues,
      chains: params.chains
    }
  };
}

async function handleRepresentationAction(params: any): Promise<any> {
  const style = params.style || "cartoon";
  const validStyles = [
    "cartoon", "ribbon", "surface", "ball-and-stick", "space-filling",
    "wireframe", "backbone", "putty", "gaussian"
  ];
  
  if (!validStyles.includes(style)) {
    throw new Error(`Invalid representation style: ${style}`);
  }
  
  return {
    representationChanged: true,
    style,
    quality: params.quality || "medium",
    opacity: params.opacity || 1.0,
    appliedTo: {
      residues: params.residues || "all",
      chains: params.chains || "all"
    }
  };
}

async function handleColorAction(params: any): Promise<any> {
  const colorScheme = params.colorScheme || "element";
  const validSchemes = [
    "element", "chain", "residue", "bfactor", "occupancy", 
    "rainbow", "spectrum", "hydrophobicity", "charge"
  ];
  
  if (!validSchemes.includes(colorScheme)) {
    throw new Error(`Invalid color scheme: ${colorScheme}`);
  }
  
  return {
    colorChanged: true,
    colorScheme,
    appliedTo: {
      residues: params.residues || "all",
      chains: params.chains || "all"
    },
    colorInfo: generateColorInfo(colorScheme)
  };
}

async function handleResetAction(params: any): Promise<any> {
  return {
    reset: true,
    resetType: "full",
    newState: {
      center: [0, 0, 0],
      zoom: 1.0,
      rotation: [0, 0, 0],
      representation: "cartoon",
      colorScheme: "element",
      selection: "none"
    }
  };
}

async function handleSaveAction(params: any): Promise<any> {
  const timestamp = new Date().toISOString();
  
  return {
    saved: true,
    saveId: `view_${Date.now()}`,
    timestamp,
    viewState: {
      center: [0, 0, 0],
      zoom: 1.5,
      rotation: [15, 30, 0],
      representation: "cartoon",
      colorScheme: "chain",
      selection: params.residues || []
    },
    saveLocation: "browser_storage"
  };
}

async function handleAnimationAction(params: any): Promise<any> {
  const duration = params.duration || 2000;
  
  return {
    animationStarted: true,
    duration,
    animationType: "rotation",
    parameters: {
      axis: params.axis || "y",
      fullRotation: true,
      smooth: true
    }
  };
}

// Helper functions
function generateActionMessage(action: string, result: any): string {
  switch (action) {
    case "load":
      return `Successfully loaded structure ${result.structureId} with ${result.structureInfo.residueCount} residues`;
    
    case "zoom":
      return `Zoomed to ${result.newZoom}x magnification`;
    
    case "rotate":
      return `Rotated ${result.angle}° around ${result.axis}-axis`;
    
    case "highlight":
      return `Highlighted ${result.highlightedCount} elements in ${result.color}`;
    
    case "select":
      return `Selected ${result.selectedCount} elements`;
    
    case "center":
      return `Centered view on specified targets`;
    
    case "representation":
      return `Changed representation to ${result.style} style`;
    
    case "color":
      return `Applied ${result.colorScheme} color scheme`;
    
    case "reset":
      return "Reset viewer to default state";
    
    case "save":
      return `Saved current view state as ${result.saveId}`;
    
    case "animation":
      return `Started ${result.animationType} animation for ${result.duration}ms`;
    
    default:
      return `Completed ${action} action`;
  }
}

function generateActionSuggestions(action: string, result: any): string[] {
  const suggestions: string[] = [];
  
  switch (action) {
    case "load":
      suggestions.push("Analyze the loaded structure");
      suggestions.push("Select specific regions");
      suggestions.push("Change representation style");
      break;
    
    case "zoom":
      suggestions.push("Select specific residues");
      suggestions.push("Rotate to better angle");
      suggestions.push("Change color scheme");
      break;
    
    case "highlight":
      suggestions.push("Analyze highlighted regions");
      suggestions.push("Compare with other regions");
      suggestions.push("Save current view");
      break;
    
    case "select":
      suggestions.push("Analyze selected elements");
      suggestions.push("Change representation of selection");
      suggestions.push("Center on selection");
      break;
    
    case "representation":
      suggestions.push("Adjust color scheme");
      suggestions.push("Select specific regions");
      suggestions.push("Compare different representations");
      break;
    
    case "color":
      suggestions.push("Analyze color patterns");
      suggestions.push("Select by color properties");
      suggestions.push("Save colored view");
      break;
    
    default:
      suggestions.push("Explore structure features");
      suggestions.push("Try different visualizations");
      suggestions.push("Analyze specific regions");
  }
  
  return suggestions;
}

function generateColorInfo(colorScheme: string): any {
  const colorInfo: Record<string, any> = {
    element: {
      description: "Colors atoms by element type",
      legend: { C: "gray", N: "blue", O: "red", S: "yellow" }
    },
    chain: {
      description: "Colors each chain differently",
      legend: { A: "blue", B: "red", C: "green", D: "yellow" }
    },
    residue: {
      description: "Colors by residue type",
      legend: { "Hydrophobic": "yellow", "Polar": "green", "Charged": "red" }
    },
    bfactor: {
      description: "Colors by B-factor (thermal motion)",
      legend: { "Low": "blue", "Medium": "white", "High": "red" }
    },
    rainbow: {
      description: "Rainbow colors from N to C terminus",
      legend: { "N-term": "blue", "Middle": "green", "C-term": "red" }
    }
  };
  
  return colorInfo[colorScheme] || { description: `${colorScheme} coloring applied` };
}