"""
Application configuration using Pydantic Settings.
Handles environment variables and configuration management.
"""

import json
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Service configuration
    service_name: str = "python-langgraph-service"
    debug: bool = Field(default=False, description="Enable debug mode")
    log_level: str = Field(default="INFO", description="Logging level")
    
    # Server configuration
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    workers: int = Field(default=1, description="Number of worker processes")
    
    # Security configuration
    allowed_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="CORS allowed origins"
    )
    allowed_hosts: List[str] = Field(
        default=["localhost", "127.0.0.1", "*"],
        description="Trusted hosts"
    )
    
    # AI/LangGraph configuration
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI/OpenRouter API key")
    openai_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        description="OpenAI API base URL (default: OpenRouter)"
    )
    default_model: str = Field(
        default="anthropic/claude-3-haiku:beta",
        description="Default AI model"
    )
    
    @validator('openai_api_key', pre=True, always=True)
    def load_api_key_from_settings(cls, v):
        """Load API key from settings file if not provided via environment."""
        if v:
            return v
            
        # Try to load from settings file
        config_file = Path.home() / ".bioai" / "config.json"
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    if config.get('openai_api_key'):
                        return config['openai_api_key']
            except (json.JSONDecodeError, IOError):
                pass
                
        return v
    
    @validator('openai_base_url', pre=True, always=True)
    def load_base_url_from_settings(cls, v):
        """Load base URL from settings file if available."""
        # Try to load from settings file
        config_file = Path.home() / ".bioai" / "config.json"
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    if config.get('openai_base_url'):
                        return config['openai_base_url']
            except (json.JSONDecodeError, IOError):
                pass
                
        return v
    
    @validator('default_model', pre=True, always=True)
    def load_model_from_settings(cls, v):
        """Load default model from settings file if available."""
        # Try to load from settings file
        config_file = Path.home() / ".bioai" / "config.json"
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    if config.get('default_model'):
                        return config['default_model']
            except (json.JSONDecodeError, IOError):
                pass
                
        return v
    
    # Redis configuration for caching
    redis_url: str = Field(
        default="redis://localhost:6379",
        description="Redis connection URL"
    )
    cache_ttl: int = Field(
        default=3600,
        description="Cache TTL in seconds"
    )
    
    # Performance settings
    max_concurrent_requests: int = Field(
        default=10,
        description="Maximum concurrent requests"
    )
    request_timeout: int = Field(
        default=30,
        description="Request timeout in seconds"
    )
    
    # Scientific computing settings
    max_structure_size_mb: int = Field(
        default=10,
        description="Maximum molecular structure file size in MB"
    )
    enable_structure_caching: bool = Field(
        default=True,
        description="Enable molecular structure caching"
    )
    
    class Config:
        env_file = ".env"
        env_prefix = "LANGGRAPH_"
        case_sensitive = False


def get_settings() -> Settings:
    """Get application settings (not cached to allow runtime updates)."""
    return Settings()

@lru_cache()
def get_cached_settings() -> Settings:
    """Get cached application settings (for performance where updates aren't needed)."""
    return Settings()