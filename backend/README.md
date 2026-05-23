# Ranting Chant Backend

## 🚀 Features

- **FastAPI Framework**: Modern, fast web framework for building APIs
- **AI Integration**: Google Gemini for conversation intelligence and follow-up generation
- **Voice Services**: ElevenLabs for text-to-speech and Faster-Whisper for speech-to-text
- **Notification System**: Email (Resend) and SMS (Twilio) notification services
- **MCP Support**: Model Context Protocol for property, tenant, vendor, and request management
- **Docker Support**: Multi-stage Dockerfile and docker-compose for easy deployment
- **Rate Limiting**: Built-in request rate limiting with SlowAPI
- **Logging**: Comprehensive logging system with file and console output
- **Security**: Non-root user in Docker, input validation, encryption utilities
- **Configuration**: JSON-based configuration management
- **Health Checks**: Built-in health check endpoints
- **Development Ready**: Hot reload support for development

## 📁 Project Structure

```
ranting_chant/
├── src/
│   ├── ai/                   # AI-powered conversation features
│   │   ├── classifier.py     # Message classification
│   │   ├── conversation_engine.py  # Conversation management
│   │   ├── follow_up_generator.py  # AI follow-up generation
│   │   ├── gemini_client.py  # Google Gemini API client
│   │   └── system_prompt.py  # System prompts for AI
│   ├── api_endpoints/        # API route definitions
│   │   ├── root_endpoint.py  # Root/health check endpoint
│   │   └── routers/          # API routers
│   │       ├── conversation_router.py  # Conversation endpoints
│   │       ├── managers_router.py      # Manager management
│   │       ├── mcp_router.py           # MCP endpoints
│   │       ├── mcp/                    # MCP implementations
│   │       ├── properties_router.py    # Property management
│   │       ├── requests_router.py      # Request management
│   │       ├── tenants_router.py       # Tenant management
│   │       ├── vendors_router.py       # Vendor management
│   │       └── voice_router.py         # Voice services
│   ├── core_specs/           # Core configuration and data
│   │   ├── configuration/    # JSON config files and loaders
│   │   └── data/            # Data files and loaders
│   ├── mcp/                 # Model Context Protocol
│   │   ├── mcp_registry.py  # MCP registry
│   │   ├── property_mcp.py  # Property MCP
│   │   ├── request_mcp.py   # Request MCP
│   │   ├── tenant_mcp.py    # Tenant MCP
│   │   └── vendor_mcp.py    # Vendor MCP
│   ├── models/              # Pydantic models
│   │   ├── manager.py       # Manager model
│   │   ├── owner.py         # Owner model
│   │   ├── property.py      # Property model
│   │   ├── request.py       # Request model
│   │   ├── tenant.py        # Tenant model
│   │   └── vendor.py        # Vendor model
│   ├── notifications/       # Notification services
│   │   ├── email_service.py      # Email via Resend
│   │   ├── notification_dispatcher.py  # Notification dispatcher
│   │   └── sms_service.py        # SMS via Twilio
│   ├── resources/           # Database related folder
│   │   ├── db/              # Migration related files for DBs
│   │   └── mock_db_jsons/   # Mock JSONs approximating actual tables
│   ├── utils/               # Utility modules
│   │   ├── custom_logger.py      # Logging configuration
│   │   ├── en_de_crypt.py        # Encryption/decryption utilities
│   │   ├── json_store.py         # JSON storage utilities
│   │   ├── keys_generator.py     # Key generation utilities
│   │   ├── limiter.py            # Rate limiting setup
│   │   ├── pycache_n_logs_deleter.py  # Cache and log cleanup
│   │   ├── request_limiter.py    # Rate limit handlers
│   │   └── validators.py         # Input validation utilities
│   └── voice/               # Voice services
│       ├── stt_service.py   # Speech-to-text (Faster-Whisper)
│       └── tts_service.py   # Text-to-speech (ElevenLabs)
├── logs/                    # Log files (created automatically)
├── tests/                   # Test files
│   └── test_conversation_engine.py
├── main.py                  # Application entry point
├── requirements.txt         # Python dependencies
├── DOCKERFILE              # Docker build configuration
├── docker-compose.yml      # Docker compose configuration
├── .env.example            # Environment variables template
├── .dockerignore           # Docker ignore file
├── start.sh                # Linux/Mac startup script
├── start.bat               # Windows startup script
└── README.md              # This file
```

## 🛠️ Quick Start

### Option 1: Run with Python (Development)

1. **Clone and setup**:
   ```bash
   cd ranting_chant/backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration and API keys
   ```

3. **Run the application**:
   ```bash
   python main.py
   ```

4. **Access the API**:
   - API: http://localhost:8000
   - Documentation: http://localhost:8000/docs
   - Alternative docs: http://localhost:8000/redoc

### Option 2: Run with Docker (Production)

1. **Build and run with Docker Compose**:
   ```bash
   cd ranting_chant/backend
   docker-compose up --build
   ```

2. **Or build and run manually**:
   ```bash
   docker build -t ranting-chant-backend .
   docker run -p 8000:8000 --env-file .env ranting-chant-backend
   ```

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Security Keys (replace with actual keys in production)
E_PRIVATE_KEY=your_private_key_here
E_PRIVATE_PASSWORD=your_private_password_here
E_PUBLIC_KEY=your_public_key_here

# API Configuration
API_TITLE=Ranting Chant restful API
API_VERSION=1.0.0
API_DESCRIPTION=backend for ranting chant application, built with FastAPI

# AI API Keys
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Notification API Keys
RESEND_API_KEY=your_resend_api_key_here
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_VERIFIED_PHONE=your_verified_phone_number_here
TWILIO_API_KEY_SID=your_twilio_api_key_sid_here
TWILIO_API_KEY_SECRET=your_twilio_api_key_secret_here

# Database Configuration (uncomment if using database)
# POSTGRES_DB=api_db
# POSTGRES_USER=api_user
# POSTGRES_PASSWORD=api_password
# DATABASE_URL=postgresql://api_user:api_password@postgres:5432/api_db

# Redis Configuration (uncomment if using Redis)
# REDIS_URL=redis://redis:6379/0

# Logging
LOG_LEVEL=info
```

### JSON Configuration (src/core_specs/configuration/config_file.json)

The backend uses JSON-based configuration for:
- Network settings (host, port, workers)
- Endpoint configurations (rate limits, routes)
- Logging settings
- Email validation rules

## 📝 Adding New Endpoints

1. **Create a new router file** in `src/api_endpoints/routers/`:
   ```python
   from fastapi import APIRouter, Request
   from src.utils.limiter import limiter
   from src.core_specs.configuration.config_loader import config_loader

   router = APIRouter(prefix="/api/v1", tags=["your_tag"])

   @router.get("/your-endpoint")
   @limiter.limit("10/minute")
   async def your_endpoint(request: Request):
       return {"message": "Your endpoint response"}
   ```

2. **Create Pydantic models** in `src/models/` if needed:
   ```python
   from pydantic import BaseModel

   class YourModel(BaseModel):
       field1: str
       field2: int
   ```

3. **Register the router** in `main.py`:
   ```python
   from src.api_endpoints.routers.your_router import router as your_router
   app.include_router(your_router)
   ```

4. **Update configuration** in `config_file.json` if needed.

## 🔒 Security Features

- **Rate Limiting**: Configurable per-endpoint rate limiting
- **Input Validation**: Pydantic models for request validation
- **Encryption**: Built-in encryption/decryption utilities
- **Non-root Docker**: Container runs as non-root user
- **Environment Variables**: Sensitive data via environment variables

## 📊 Logging

The backend includes comprehensive logging:
- **File Logging**: Timestamped log files in `logs/` directory
- **Console Logging**: Structured output for containers
- **Configurable Levels**: Debug, Info, Warning, Error, Critical
- **Request Logging**: Automatic API request logging

## 🐳 Docker Features

### Multi-stage Build
- **Builder stage**: Installs dependencies
- **Production stage**: Minimal runtime image
- **Security**: Non-root user execution
- **Health checks**: Built-in container health monitoring

### Docker Compose
- **Development**: Hot reload support (commented)
- **Production**: Optimized for deployment
- **Services**: Ready for Redis, PostgreSQL integration
- **Volumes**: Persistent log storage

## 🧪 Development

### Hot Reload Development
```bash
# Enable hot reload in docker-compose.yml
docker-compose up --build
```

### Adding Dependencies
```bash
pip install new-package
pip freeze > requirements.txt
```

### Running Tests
```bash
# Add your test framework
pip install pytest
pytest tests/
```

## 🚀 Deployment

### Production Deployment
1. **Update environment variables** for production
2. **Build production image**:
   ```bash
   docker build -t your-api:latest .
   ```
3. **Deploy with docker-compose**:
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

### Cloud Deployment
The backend is ready for deployment on:
- **AWS ECS/Fargate**
- **Google Cloud Run**
- **Azure Container Instances**
- **Heroku**
- **DigitalOcean App Platform**

## 📚 API Documentation

Once running, access interactive API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Available Endpoints

The backend includes the following routers:
- **Root**: Health check and basic endpoints
- **Tenants**: Tenant management endpoints
- **Properties**: Property management endpoints
- **Vendors**: Vendor management endpoints
- **Managers**: Manager management endpoints
- **Requests**: Request management endpoints
- **MCP**: Model Context Protocol endpoints
- **Conversation**: AI-powered conversation endpoints
- **Voice**: Speech-to-text and text-to-speech endpoints

## 🔧 Customization

### Changing the API Title/Description
Update in `main.py`:
```python
app = FastAPI(
    title="Your API Name",
    description="Your API Description",
    version="1.0.0"
)
```

### Adding Database Support
1. Uncomment database service in `docker-compose.yml`
2. Add database dependencies to `requirements.txt`
3. Create database connection utilities in `src/utils/`

### Adding Authentication
1. Install authentication dependencies
2. Create auth utilities in `src/utils/`
3. Add authentication middleware to `main.py`

## 📋 Requirements

- Python 3.12+
- Docker (optional)
- Docker Compose (optional)
- API Keys for:
  - Google Gemini (for AI features)
  - ElevenLabs (for text-to-speech)
  - Resend (for email notifications)
  - Twilio (for SMS notifications)

## 📄 License

This backend is provided as-is for educational and development purposes.

---

**Ready to build your REST API!** 🚀

Start by customizing the configuration files and adding your endpoints in the `src/api_endpoints/` directory.