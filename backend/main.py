"""
#############################################################################
### Main backend file
###
### @file main.py
### @author Sebastian Russo
### @date 2025
#############################################################################

This module initializes the FastAPI backend locally for development.
It sets up routers, custom logger, rate limiter, and loads environment variables.
"""

#Native imports
import os
from contextlib import asynccontextmanager

#Third-party imports
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
load_dotenv()

#Other files imports
from src.utils.request_limiter import rate_limit_handler
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter

#Json files
from src.core_specs.configuration.config_loader import config_loader
from src.core_specs.data.data_loader import data_loader

#Endpoints imports
from src.api_endpoints.root_endpoint import router as root_router
from src.api_endpoints.routers.tenant_routers.tenants_router import router as tenants_router
from src.api_endpoints.routers.property_routers.properties_router import router as properties_router
from src.api_endpoints.routers.vendor_routers.vendors_router import router as vendors_router
from src.api_endpoints.routers.owner_manager_routers.managers_router import router as managers_router
from src.api_endpoints.routers.owner_manager_routers.owners_router import router as owners_router
from src.api_endpoints.routers.owner_manager_routers.auth_router import router as auth_router
from src.api_endpoints.routers.conver_reque_routers.requests_router import router as requests_router
from src.api_endpoints.routers.mcp_routers.mcp_router import router as mcp_router
from src.api_endpoints.routers.conver_reque_routers.conversation_router import router as conversation_router
from src.api_endpoints.routers.voice_routers.voice_router import router as voice_router

"""API APP-----------------------------------------------------------"""
#Lifespan event manager (startup and shutdown)
@asynccontextmanager
async def lifespan(app: FastAPI):
    port = config_loader["network"]["server_port"]
    log_handler.info(f"[main] Ranting Chat server starting on port {port}")
    yield
    log_handler.info(f"[main] Ranting Chat server shutting down")

#Create FastAPI app
app = FastAPI(
    lifespan=lifespan, 
    title=os.getenv("API_TITLE", "Ranting Chat"),
    version=os.getenv("API_VERSION", "1.0.0"),
    description=os.getenv("API_DESCRIPTION", "A chat application for building REST APIs with FastAPI")
)

"""VARIOUS-----------------------------------------------------------"""
#Setup rate limiter
app.state.limiter = limiter

#Add global exception handler for rate limits
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

#Add global exception handler for unhandled 500 errors
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Global exception handler for unhandled errors.
    Logs the error and returns a generic error message.
    """
    log_handler.error(f"[main] Unhandled exception: {exc}")
    return {"error": "Internal server error"}

#CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""Routers-----------------------------------------------------------"""
#Root
app.include_router(root_router)

#Others
app.include_router(tenants_router)
app.include_router(properties_router)
app.include_router(vendors_router)
app.include_router(managers_router)
app.include_router(owners_router)
app.include_router(auth_router)
app.include_router(requests_router)
app.include_router(mcp_router)
app.include_router(conversation_router)
app.include_router(voice_router)

"""Start server-----------------------------------------------------------"""
if __name__ == "__main__":
    port = config_loader["network"]["server_port"]
    
    uvicorn.run(
        config_loader["network"]["uvicorn_app_reference"],
        host=config_loader["network"]["host"],
        port=config_loader["network"]["server_port"],
        reload=config_loader["network"]["reload"],
        workers=config_loader["network"]["workers"],
        proxy_headers=config_loader["network"]["proxy_headers"]
    )
    
    log_handler.info(f"[main] Loaded configuration: \n {config_loader}")
    log_handler.info(f"[main] Loaded data: \n {data_loader}")
    #available at: http://127.0.0.1:8000/docs
