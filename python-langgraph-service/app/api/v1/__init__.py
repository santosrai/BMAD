"""
API v1 routes and endpoints.
"""

from fastapi import APIRouter

from .workflow import router as workflow_router
from .molecular_analysis import router as molecular_router
from .settings import router as settings_router
from .test import router as test_router

router = APIRouter()

# Include sub-routers
router.include_router(workflow_router, prefix="/workflow", tags=["workflow"])
router.include_router(molecular_router, prefix="/molecular", tags=["molecular_analysis"])
router.include_router(settings_router, prefix="/settings", tags=["settings"])
router.include_router(test_router, prefix="/test", tags=["testing"])

@router.get("/")
async def api_v1_root():
    """API v1 root endpoint."""
    return {
        "api_version": "v1",
        "available_endpoints": [
            "/workflow/execute",
            "/workflow/status/{workflow_id}",
            "/workflow/stop/{workflow_id}",
            "/molecular/molecular-analysis",
            "/molecular/pdb-search",
            "/molecular/small-molecule-analysis",
            "/molecular/structure-comparison",
            "/settings/",
            "/settings/status",
            "/settings/configure",
            "/test/ai",
            "/test/config",
            "/test/workflow",
        ],
        "service": "python-langgraph-service"
    }