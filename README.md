# Ranting Chant

AI-powered property operations platform with voice-enabled conversational interface for tenants and management dashboard for property managers.

## 🎯 Overview

Ranting Chant is a full-stack property management solution that enables:
- **Tenants** to report issues via natural conversation (text or voice) with AI-powered intelligence
- **Managers** to oversee all requests with an intelligent dashboard featuring AI summaries and analytics
- **Real-time notifications** via email and SMS for urgent issues
- **Voice interaction** using speech-to-text and text-to-speech capabilities

## 🏗️ Architecture

The project consists of two main components:

- **Backend** (`/backend`) - FastAPI REST API with AI integration, voice services, and notification systems
- **Frontend** (`/frontend`) - React 19 + TypeScript application with Frutiger Aero design system

## 🚀 Quick Start

### Prerequisites

- Python 3.12+ (for backend)
- Node.js 18+ or bun (for frontend)
- API Keys for:
  - Google Gemini (AI features)
  - ElevenLabs (text-to-speech)
  - Resend (email notifications)
  - Twilio (SMS notifications)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment and install dependencies**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. **Run the backend**:
   ```bash
   python main.py
   ```

5. **Access the API**:
   - API: http://localhost:8000
   - Documentation: http://localhost:8000/docs

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your backend API URL
   VITE_API_URL=http://localhost:8000
   ```

4. **Run the development server**:
   ```bash
   bun run dev
   ```

5. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

## 🌟 Features

### Backend Features

- **FastAPI Framework**: Modern, fast web framework for building APIs
- **AI Integration**: Google Gemini for conversation intelligence and follow-up generation
- **Voice Services**: ElevenLabs for text-to-speech and Faster-Whisper for speech-to-text
- **Notification System**: Email (Resend) and SMS (Twilio) notification services
- **MCP Support**: Model Context Protocol for property, tenant, vendor, and request management
- **Docker Support**: Multi-stage Dockerfile and docker-compose for easy deployment
- **Rate Limiting**: Built-in request rate limiting with SlowAPI
- **Logging**: Comprehensive logging system with file and console output
- **Security**: Non-root user in Docker, input validation, encryption utilities
- **Health Checks**: Built-in health check endpoints

### Frontend Features

- **Modern Tech Stack**: React 19, TypeScript, Vite 7, TanStack Router
- **Frutiger Aero Design**: Glassmorphism, glossy buttons, sky-blue glows on deep-navy background
- **AI-Powered Chat**: Natural conversation interface with voice mode
- **Tenant Dashboard**: Request list with expandable timeline and status tracking
- **Management Dashboard**: Stats, filters, sortable table, and AI-powered summaries
- **Real-time Voice**: Speech-to-text and text-to-speech integration
- **Responsive Design**: Tablet and desktop optimized
- **Toast Notifications**: User feedback via Sonner

## 📁 Project Structure

```
ranting_chant/
├── backend/                 # FastAPI backend
│   ├── src/
│   │   ├── ai/             # AI-powered conversation features
│   │   ├── api_endpoints/  # API route definitions
│   │   ├── core_specs/     # Configuration and data
│   │   ├── mcp/            # Model Context Protocol
│   │   ├── models/         # Pydantic models
│   │   ├── notifications/  # Email and SMS services
│   │   ├── resources/      # Database related files
│   │   ├── utils/          # Utility modules
│   │   └── voice/          # Speech-to-text and text-to-speech
│   ├── tests/              # Test files
│   ├── main.py             # Application entry point
│   ├── requirements.txt    # Python dependencies
│   ├── DOCKERFILE          # Docker configuration
│   ├── docker-compose.yml  # Docker compose configuration
│   └── .env.example        # Environment variables template
├── frontend/               # React frontend
│   ├── src/
│   │   ├── routes/         # File-based routes (TanStack Router)
│   │   ├── components/     # React components
│   │   ├── context/        # Global app state
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service
│   │   ├── types/          # TypeScript interfaces
│   │   └── styles.css      # Tailwind v4 + design tokens
│   ├── package.json        # Node dependencies
│   └── .env.example        # Environment variables template
├── documentation/          # Project documentation
│   ├── PRD.md             # Product Requirements Document
│   ├── elevenlabs_calls.md # ElevenLabs API documentation
│   ├── gemini_calls.md    # Gemini API documentation
│   └── outline.md         # Project outline
└── README.md              # This file
```

## 🔧 Configuration

### Backend Environment Variables

Key variables in `backend/.env`:

```bash
# Security Keys
E_PRIVATE_KEY=your_private_key_here
E_PRIVATE_PASSWORD=your_private_password_here
E_PUBLIC_KEY=your_public_key_here

# AI API Keys
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Notification API Keys
RESEND_API_KEY=your_resend_api_key_here
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_VERIFIED_PHONE=your_verified_phone_number_here
```

### Frontend Environment Variables

Key variable in `frontend/.env`:

```bash
VITE_API_URL=http://localhost:8000
```

## 🐳 Docker Deployment

### Backend with Docker

```bash
cd backend
docker-compose up --build
```

Or build manually:

```bash
docker build -t ranting-chant-backend .
docker run -p 8000:8000 --env-file .env ranting-chant-backend
```

## 📊 API Documentation

Once the backend is running, access interactive API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Available Endpoints

The backend includes routers for:
- **Root**: Health check and basic endpoints
- **Tenants**: Tenant management
- **Properties**: Property management
- **Vendors**: Vendor management
- **Managers**: Manager management
- **Requests**: Request management
- **MCP**: Model Context Protocol
- **Conversation**: AI-powered conversation
- **Voice**: Speech-to-text and text-to-speech

## 🚀 Deployment

### Cloud Deployment Options

**Backend** can be deployed to:
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- Heroku
- DigitalOcean App Platform

**Frontend** can be deployed to:
- Vercel (recommended)
- Netlify
- AWS S3 + CloudFront
- GitHub Pages
- Any static hosting service

### Vercel Frontend Deployment

1. Connect GitHub repository to Vercel
2. Set root directory to `frontend`
3. Set build command to `bun run build`
4. Set output directory to `dist`
5. Add environment variable: `VITE_API_URL=https://your-backend-url.com`
6. Deploy

## 📚 Documentation

- **Product Requirements**: See `documentation/PRD.md`
- **API Integration**: See `documentation/elevenlabs_calls.md` and `documentation/gemini_calls.md`
- **Project Outline**: See `documentation/outline.md`
- **Backend Details**: See `backend/README.md`
- **Frontend Details**: See `frontend/README.md`

## 🛠️ Development

### Backend Development

```bash
cd backend
# Hot reload is enabled by default
python main.py
```

### Frontend Development

```bash
cd frontend
bun run dev
```

### Adding Dependencies

**Backend**:
```bash
pip install new-package
pip freeze > requirements.txt
```

**Frontend**:
```bash
bun add new-package
```

## 🔒 Security Features

- Rate limiting on all API endpoints
- Input validation with Pydantic models
- Encryption/decryption utilities
- Non-root Docker user execution
- Environment variables for sensitive data
- CORS configuration for API access

## 📄 License

This project is provided as-is for educational and development purposes.

---

**Ready to streamline property management with AI!** 🚀

For detailed information about each component, refer to the individual README files in the `backend/` and `frontend/` directories.
