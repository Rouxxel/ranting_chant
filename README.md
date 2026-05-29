# Ranting Chant

AI-powered property operations platform with a conversational tenant intake flow, voice support, and a management dashboard for property managers and owners.

## Overview

Ranting Chant is a full-stack property management solution that enables:

- **Tenants** to report issues through natural conversation, with optional voice input.
- **Managers and owners** to review, filter, approve, and resolve tenant requests.
- **AI-assisted triage** using canonical request types, urgency, sentiment, confidence, and escalation signals.
- **Notifications** through email and SMS services for request creation and urgent escalation.
- **Vendor coordination** through service-category lookups and emergency vendor support.

## Architecture

The project has two main applications:

- **Backend** (`/backend`) - FastAPI REST API with AI classification, conversation orchestration, voice services, JSON-backed mock data, MCP-style tools, and notifications.
- **Frontend** (`/frontend`) - React 19 + TypeScript app using Vite, TanStack Router, Tailwind v4, shadcn/ui, and a Frutiger Aero design system.

## Quick Start

### Prerequisites

- Python 3.12+ for the backend
- Node.js 18+ or bun for the frontend
- API keys as needed for Google Gemini, ElevenLabs, Resend, and Twilio

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend URLs:

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Frontend Setup

```bash
cd frontend
bun install
bun run dev
```

Frontend URLs:

- App: `http://localhost:5173`
- Backend API expected by default: `http://localhost:8000`

For custom backend URLs, set these in `frontend/.env`:

```bash
VITE_LOCAL_BACKEND=http://localhost:8000
VITE_PROD_BACKEND=https://your-production-backend.example.com
```

## Current Feature Set

### Backend

- FastAPI routers for tenants, properties, vendors, managers, owners, requests, MCP, conversation, and voice.
- Google Gemini-backed conversation engine and standalone request classifier.
- Canonical request type taxonomy shared by backend models, classifier prompts, and frontend TypeScript types.
- Request type normalization for older coarse values such as `maintenance`, `access`, and `rental_agreement`.
- Voice transcription and text-to-speech response flow.
- Email and SMS notification services with readable request type labels.
- JSON-backed mock data through `json_store`.
- Rate limiting, logging, validation, and Docker support.

### Frontend

- Login flow for tenants, managers, and owners.
- Authenticated layout with shared header, role-aware navigation, avatar, and client-side logout.
- Route guards for `/chat`, `/dashboard`, `/management`, and `/vendors`.
- Tenant chat flow with text and voice input.
- Tenant request dashboard with expandable timelines.
- Management dashboard with stats, filters, sortable table, AI summaries, and request approval.
- Vendor directory with search and service filtering.
- Canonical request type labels, badges, and management filtering.
- API service with typed request, conversation, voice, and directory calls.

## Request Types

Request types are canonicalized in `backend/src/models/request.py` and mirrored in `frontend/src/types/index.ts`.

Current supported values:

- `plumbing`
- `electrical`
- `hvac`
- `appliance`
- `pest_control`
- `lockout`
- `access_control`
- `noise`
- `lease_question`
- `rent_payment`
- `emergency`
- `general`

The backend normalizes legacy values where possible:

- `maintenance` -> `general`
- `access` -> `access_control`
- `rental_agreement` -> `lease_question`
- `complaint` -> `noise`
- `billing` -> `rent_payment`

## Project Structure

```text
ranting_chant/
|-- backend/
|   |-- src/
|   |   |-- ai/
|   |   |-- api_endpoints/
|   |   |-- core_specs/
|   |   |-- mcp/
|   |   |-- models/
|   |   |-- notifications/
|   |   |-- resources/
|   |   |-- utils/
|   |   `-- voice/
|   |-- tests/
|   |-- main.py
|   |-- requirements.txt
|   `-- README.md
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- hooks/
|   |   |-- lib/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- types/
|   |   `-- styles.css
|   |-- package.json
|   `-- README.md
|-- documentation/
|-- IMPLEMENTATION_PLAN.md
`-- README.md
```

## Development

Backend tests:

```bash
cd backend
pytest tests/
```

Frontend production build:

```bash
cd frontend
bun run build
```

## Deployment

The backend can be deployed to container-friendly platforms such as Google Cloud Run, AWS ECS/Fargate, Azure Container Instances, Render, Heroku, or DigitalOcean App Platform.

The frontend can be deployed to Vercel, Netlify, AWS S3 + CloudFront, GitHub Pages, or any static hosting provider.

For Vercel:

1. Set the project root to `frontend`.
2. Set the build command to `bun run build`.
3. Set the output directory to `dist`.
4. Configure `VITE_LOCAL_BACKEND` and `VITE_PROD_BACKEND` for the target backend URLs.

## Documentation

- Backend details: `backend/README.md`
- Frontend details: `frontend/README.md`
- Product and integration docs: `documentation/`

## License

This project is provided as-is for educational and development purposes.
