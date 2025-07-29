"""
Ngrok tunnel URL detection API endpoints.
Provides automatic detection of ngrok tunnel URLs for development.
"""

import asyncio
from typing import Optional, Dict, Any
import aiohttp
import structlog
from fastapi import APIRouter, HTTPException

logger = structlog.get_logger(__name__)
router = APIRouter()


class NgrokURLDetector:
    """Detects ngrok tunnel URLs using the local ngrok API."""
    
    def __init__(self):
        self.ngrok_api_url = "http://localhost:4040/api/tunnels"
        self.timeout = 5  # seconds
    
    async def get_tunnel_url(self) -> Optional[str]:
        """
        Get the current ngrok tunnel URL.
        
        Returns:
            str: The public HTTPS URL of the ngrok tunnel, or None if not found
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.ngrok_api_url, 
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status != 200:
                        logger.warning(
                            "Failed to connect to ngrok API", 
                            status=response.status,
                            url=self.ngrok_api_url
                        )
                        return None
                    
                    data = await response.json()
                    tunnels = data.get("tunnels", [])
                    
                    # Look for HTTPS tunnel first (preferred)
                    for tunnel in tunnels:
                        if tunnel.get("proto") == "https":
                            url = tunnel.get("public_url")
                            if url:
                                logger.info("Found ngrok HTTPS tunnel", url=url)
                                return url
                    
                    # Fallback to HTTP tunnel if no HTTPS found
                    for tunnel in tunnels:
                        if tunnel.get("proto") == "http":
                            url = tunnel.get("public_url")
                            if url:
                                logger.info("Found ngrok HTTP tunnel", url=url)
                                return url
                    
                    logger.warning("No active ngrok tunnels found", tunnels_count=len(tunnels))
                    return None
                    
        except asyncio.TimeoutError:
            logger.warning("Timeout connecting to ngrok API", timeout=self.timeout)
            return None
        except aiohttp.ClientError as e:
            logger.warning("Error connecting to ngrok API", error=str(e))
            return None
        except Exception as e:
            logger.error("Unexpected error getting ngrok URL", error=str(e))
            return None
    
    async def get_tunnel_info(self) -> Dict[str, Any]:
        """
        Get detailed information about all active tunnels.
        
        Returns:
            dict: Complete tunnel information from ngrok API
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.ngrok_api_url,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status != 200:
                        return {"error": f"Failed to connect to ngrok API: {response.status}"}
                    
                    return await response.json()
                    
        except Exception as e:
            return {"error": str(e)}


# Create detector instance
detector = NgrokURLDetector()


@router.get("/url")
async def get_ngrok_url():
    """
    Get the current ngrok tunnel URL for this service.
    
    Returns the public URL if an ngrok tunnel is active,
    otherwise returns localhost URL as fallback.
    """
    logger.info("Attempting to detect ngrok tunnel URL")
    
    tunnel_url = await detector.get_tunnel_url()
    
    if tunnel_url:
        return {
            "status": "success",
            "url": tunnel_url,
            "type": "ngrok_tunnel",
            "message": "Ngrok tunnel detected successfully"
        }
    else:
        # Fallback to localhost
        fallback_url = "http://localhost:8000"
        return {
            "status": "fallback",
            "url": fallback_url,
            "type": "localhost",
            "message": "No ngrok tunnel found, using localhost URL"
        }


@router.get("/info")
async def get_ngrok_info():
    """
    Get detailed information about all active ngrok tunnels.
    Useful for debugging tunnel configuration.
    """
    logger.info("Getting detailed ngrok tunnel information")
    
    tunnel_info = await detector.get_tunnel_info()
    
    if "error" in tunnel_info:
        return {
            "status": "error",
            "message": tunnel_info["error"],
            "tunnels": []
        }
    
    tunnels = tunnel_info.get("tunnels", [])
    
    # Process tunnel information for easier consumption
    processed_tunnels = []
    for tunnel in tunnels:
        processed_tunnels.append({
            "name": tunnel.get("name"),
            "proto": tunnel.get("proto"),
            "public_url": tunnel.get("public_url"),
            "config": {
                "addr": tunnel.get("config", {}).get("addr"),
                "inspect": tunnel.get("config", {}).get("inspect")
            }
        })
    
    return {
        "status": "success",
        "tunnels": processed_tunnels,
        "tunnel_count": len(processed_tunnels),
        "has_https": any(t["proto"] == "https" for t in processed_tunnels),
        "has_http": any(t["proto"] == "http" for t in processed_tunnels)
    }


@router.get("/status")
async def get_ngrok_status():
    """
    Check if ngrok is running and accessible.
    Returns status information without detailed tunnel data.
    """
    logger.info("Checking ngrok service status")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                detector.ngrok_api_url,
                timeout=aiohttp.ClientTimeout(total=detector.timeout)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    tunnel_count = len(data.get("tunnels", []))
                    
                    return {
                        "status": "running",
                        "api_accessible": True,
                        "tunnel_count": tunnel_count,
                        "api_url": detector.ngrok_api_url
                    }
                else:
                    return {
                        "status": "error",
                        "api_accessible": False,
                        "error": f"HTTP {response.status}",
                        "api_url": detector.ngrok_api_url
                    }
                    
    except Exception as e:
        return {
            "status": "not_running",
            "api_accessible": False,
            "error": str(e),
            "api_url": detector.ngrok_api_url
        }


@router.post("/refresh")
async def refresh_ngrok_url():
    """
    Force refresh of ngrok tunnel detection.
    Useful when tunnels have been restarted.
    """
    logger.info("Forcing refresh of ngrok tunnel detection")
    
    # Get fresh tunnel information
    tunnel_url = await detector.get_tunnel_url()
    tunnel_info = await detector.get_tunnel_info()
    
    if tunnel_url:
        return {
            "status": "success",
            "url": tunnel_url,
            "type": "ngrok_tunnel",
            "message": "Ngrok tunnel refreshed successfully",
            "tunnel_count": len(tunnel_info.get("tunnels", []))
        }
    else:
        return {
            "status": "no_tunnel",
            "url": "http://localhost:8000",
            "type": "localhost",
            "message": "No active ngrok tunnel found after refresh",
            "tunnel_count": 0
        }