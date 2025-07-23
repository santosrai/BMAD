"""
Settings API endpoints for OpenRouter API key configuration.
Provides a web interface for configuring API keys directly in the backend.
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional

import structlog
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from ...config import get_settings

logger = structlog.get_logger(__name__)


async def reinitialize_workflow_engine():
    """Reinitialize the workflow engine with updated settings."""
    try:
        import app.engine as engine
        from ...agents.langgraph_engine import LangGraphWorkflowEngine
        
        # Get updated settings
        settings = get_settings()
        
        if not settings.openai_api_key:
            raise ValueError("No API key configured")
        
        # Clean up existing engine
        if engine.workflow_engine:
            await engine.workflow_engine.cleanup()
        
        # Create new engine with updated settings
        engine.workflow_engine = LangGraphWorkflowEngine(
            openai_api_key=settings.openai_api_key,
            openai_base_url=settings.openai_base_url,
            default_model=settings.default_model
        )
        
        # Initialize the new engine
        await engine.workflow_engine.initialize()
        
        logger.info("Workflow engine reinitialized with new settings",
                   base_url=settings.openai_base_url,
                   model=settings.default_model)
        
    except Exception as e:
        logger.error("Failed to reinitialize workflow engine", error=str(e))
        raise

router = APIRouter()

# Path to store API key configuration
CONFIG_FILE = Path.home() / ".bioai" / "config.json"


class ApiKeyConfig(BaseModel):
    """API key configuration model."""
    openai_api_key: str = Field(..., description="OpenRouter API key")
    openai_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        description="OpenRouter API base URL"
    )
    default_model: str = Field(
        default="anthropic/claude-3-haiku:beta",
        description="Default AI model"
    )


class ApiKeyStatus(BaseModel):
    """API key status model."""
    configured: bool = Field(description="Whether API key is configured")
    has_key: bool = Field(description="Whether API key exists")
    base_url: str = Field(description="Current base URL")
    model: str = Field(description="Current default model")


def ensure_config_dir():
    """Ensure configuration directory exists."""
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)


def load_config() -> Dict[str, Any]:
    """Load configuration from file."""
    ensure_config_dir()
    
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.warning("Failed to load config file", error=str(e))
    
    return {}


def save_config(config: Dict[str, Any]):
    """Save configuration to file."""
    ensure_config_dir()
    
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        logger.info("Configuration saved successfully")
    except IOError as e:
        logger.error("Failed to save config file", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to save configuration")


def get_current_api_key() -> Optional[str]:
    """Get current API key from config file or environment."""
    # Check config file first
    config = load_config()
    if config.get('openai_api_key'):
        return config['openai_api_key']
    
    # Fall back to environment variable
    settings = get_settings()
    return getattr(settings, 'openai_api_key', None)


@router.get("/status", response_model=ApiKeyStatus)
async def get_api_key_status():
    """Get current API key configuration status."""
    config = load_config()
    settings = get_settings()
    
    # Check if API key is configured
    api_key = get_current_api_key()
    has_key = bool(api_key)
    
    return ApiKeyStatus(
        configured=has_key,
        has_key=has_key,
        base_url=config.get('openai_base_url', settings.openai_base_url),
        model=config.get('default_model', settings.default_model)
    )


@router.post("/configure")
async def configure_api_key(config: ApiKeyConfig):
    """Configure OpenRouter API key and settings."""
    try:
        # Validate API key format (basic check)
        if not config.openai_api_key.startswith(('sk-', 'or-')):
            raise HTTPException(
                status_code=400,
                detail="Invalid API key format. OpenRouter keys should start with 'sk-' or 'or-'"
            )
        
        # Save configuration
        from datetime import datetime
        config_data = {
            'openai_api_key': config.openai_api_key,
            'openai_base_url': config.openai_base_url,
            'default_model': config.default_model,
            'updated_at': datetime.now().isoformat()
        }
        
        save_config(config_data)
        
        # Reinitialize the workflow engine with new settings
        await reinitialize_workflow_engine()
        
        logger.info("API key configured successfully", 
                   base_url=config.openai_base_url,
                   model=config.default_model)
        
        return {
            "message": "API key configured successfully and workflow engine reinitialized",
            "status": "success",
            "base_url": config.openai_base_url,
            "model": config.default_model
        }
        
    except Exception as e:
        logger.error("Failed to configure API key", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/configure")
async def clear_api_key():
    """Clear stored API key configuration."""
    try:
        if CONFIG_FILE.exists():
            CONFIG_FILE.unlink()
            logger.info("API key configuration cleared")
        
        return {
            "message": "API key configuration cleared successfully",
            "status": "success"
        }
        
    except Exception as e:
        logger.error("Failed to clear API key", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_class=HTMLResponse)
async def settings_page(request: Request):
    """Serve the settings configuration page."""
    
    # Get current status
    config = load_config()
    settings = get_settings()
    api_key = get_current_api_key()
    
    # Mask API key for display
    masked_key = ""
    if api_key:
        if len(api_key) > 8:
            masked_key = api_key[:4] + "..." + api_key[-4:]
        else:
            masked_key = "***"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BioAI Python Service - Settings</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 2rem;
                background-color: #f8fafc;
                color: #334155;
            }}
            .container {{
                background: white;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 2rem;
                text-align: center;
            }}
            .header h1 {{
                margin: 0 0 0.5rem 0;
                font-size: 2rem;
                font-weight: 700;
            }}
            .header p {{
                margin: 0;
                opacity: 0.9;
            }}
            .content {{
                padding: 2rem;
            }}
            .status-card {{
                background: #f1f5f9;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 2rem;
            }}
            .status-card h3 {{
                margin: 0 0 1rem 0;
                color: #1e293b;
            }}
            .status-item {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }}
            .status-item:last-child {{
                margin-bottom: 0;
            }}
            .status-badge {{
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.875rem;
                font-weight: 500;
                text-transform: uppercase;
            }}
            .status-success {{
                background: #dcfce7;
                color: #166534;
            }}
            .status-error {{
                background: #fef2f2;
                color: #dc2626;
            }}
            .form-section {{
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 2rem;
            }}
            .form-section h3 {{
                margin: 0 0 1.5rem 0;
                color: #1e293b;
            }}
            .form-group {{
                margin-bottom: 1.5rem;
            }}
            .form-group label {{
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 500;
                color: #374151;
            }}
            .form-group input, .form-group select {{
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 1rem;
                box-sizing: border-box;
            }}
            .form-group input:focus, .form-group select:focus {{
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }}
            .btn {{
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 6px;
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-right: 0.5rem;
            }}
            .btn-primary {{
                background: #667eea;
                color: white;
            }}
            .btn-primary:hover {{
                background: #5a67d8;
            }}
            .btn-danger {{
                background: #dc2626;
                color: white;
            }}
            .btn-danger:hover {{
                background: #b91c1c;
            }}
            .alert {{
                padding: 1rem;
                border-radius: 6px;
                margin-bottom: 1rem;
            }}
            .alert-success {{
                background: #dcfce7;
                color: #166534;
                border: 1px solid #bbf7d0;
            }}
            .alert-error {{
                background: #fef2f2;
                color: #dc2626;
                border: 1px solid #fecaca;
            }}
            .hidden {{
                display: none;
            }}
            .code {{
                font-family: 'Courier New', monospace;
                background: #f1f5f9;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.875rem;
            }}
            .info-box {{
                background: #f0f9ff;
                border: 1px solid #bfdbfe;
                border-radius: 6px;
                padding: 1rem;
                margin-top: 1rem;
                color: #1e40af;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🧬 BioAI Python Service</h1>
                <p>Configure your OpenRouter API key for molecular analysis</p>
            </div>
            
            <div class="content">
                <div class="status-card">
                    <h3>Current Configuration Status</h3>
                    <div class="status-item">
                        <span>API Key Status:</span>
                        <span class="status-badge {'status-success' if api_key else 'status-error'}">
                            {'Configured' if api_key else 'Not Configured'}
                        </span>
                    </div>
                    <div class="status-item">
                        <span>API Key:</span>
                        <span class="code">{masked_key if api_key else 'Not set'}</span>
                    </div>
                    <div class="status-item">
                        <span>Base URL:</span>
                        <span class="code">{config.get('openai_base_url', settings.openai_base_url)}</span>
                    </div>
                    <div class="status-item">
                        <span>Default Model:</span>
                        <span class="code">{config.get('default_model', settings.default_model)}</span>
                    </div>
                </div>

                <div id="alert-container"></div>

                <div class="form-section">
                    <h3>Configure OpenRouter API Key</h3>
                    <form id="config-form">
                        <div class="form-group">
                            <label for="api-key">OpenRouter API Key *</label>
                            <input type="password" id="api-key" name="api-key" 
                                   placeholder="sk-or-... or or-..." required>
                        </div>
                        
                        <div class="form-group">
                            <label for="base-url">API Base URL</label>
                            <input type="url" id="base-url" name="base-url" 
                                   value="{config.get('openai_base_url', settings.openai_base_url)}">
                        </div>
                        
                        <div class="form-group">
                            <label for="model">Default Model</label>
                            <select id="model" name="model">
                                <option value="anthropic/claude-3-haiku:beta" {'selected' if config.get('default_model', settings.default_model) == 'anthropic/claude-3-haiku:beta' else ''}>Claude 3 Haiku</option>
                                <option value="anthropic/claude-3-sonnet:beta" {'selected' if config.get('default_model', settings.default_model) == 'anthropic/claude-3-sonnet:beta' else ''}>Claude 3 Sonnet</option>
                                <option value="anthropic/claude-3-opus:beta" {'selected' if config.get('default_model', settings.default_model) == 'anthropic/claude-3-opus:beta' else ''}>Claude 3 Opus</option>
                                <option value="openai/gpt-4" {'selected' if config.get('default_model', settings.default_model) == 'openai/gpt-4' else ''}>GPT-4</option>
                                <option value="openai/gpt-3.5-turbo" {'selected' if config.get('default_model', settings.default_model) == 'openai/gpt-3.5-turbo' else ''}>GPT-3.5 Turbo</option>
                            </select>
                        </div>
                        
                        <button type="submit" class="btn btn-primary">Save Configuration</button>
                        <button type="button" id="clear-btn" class="btn btn-danger">Clear Configuration</button>
                    </form>
                </div>

                <div class="info-box">
                    <strong>Note:</strong> Your API key is stored locally on this server and used directly for AI requests. 
                    This is more secure than passing it through the frontend. Get your OpenRouter API key from 
                    <a href="https://openrouter.ai/keys" target="_blank">https://openrouter.ai/keys</a>
                </div>
            </div>
        </div>

        <script>
            function showAlert(message, type) {{
                const container = document.getElementById('alert-container');
                container.innerHTML = `<div class="alert alert-${{type}}">${{message}}</div>`;
                setTimeout(() => {{
                    container.innerHTML = '';
                }}, 5000);
            }}

            document.getElementById('config-form').addEventListener('submit', async (e) => {{
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const config = {{
                    openai_api_key: formData.get('api-key'),
                    openai_base_url: formData.get('base-url'),
                    default_model: formData.get('model')
                }};

                try {{
                    const response = await fetch('/api/v1/settings/configure', {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json',
                        }},
                        body: JSON.stringify(config)
                    }});

                    const result = await response.json();
                    
                    if (response.ok) {{
                        showAlert('✅ Configuration saved successfully!', 'success');
                        setTimeout(() => {{
                            window.location.reload();
                        }}, 2000);
                    }} else {{
                        showAlert(`❌ Error: ${{result.detail || 'Unknown error'}}`, 'error');
                    }}
                }} catch (error) {{
                    showAlert(`❌ Network error: ${{error.message}}`, 'error');
                }}
            }});

            document.getElementById('clear-btn').addEventListener('click', async () => {{
                if (!confirm('Are you sure you want to clear the API key configuration?')) {{
                    return;
                }}

                try {{
                    const response = await fetch('/api/v1/settings/configure', {{
                        method: 'DELETE'
                    }});

                    const result = await response.json();
                    
                    if (response.ok) {{
                        showAlert('✅ Configuration cleared successfully!', 'success');
                        setTimeout(() => {{
                            window.location.reload();
                        }}, 2000);
                    }} else {{
                        showAlert(`❌ Error: ${{result.detail || 'Unknown error'}}`, 'error');
                    }}
                }} catch (error) {{
                    showAlert(`❌ Network error: ${{error.message}}`, 'error');
                }}
            }});
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)