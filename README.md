# Ranting Chant

AI-powered property operations platform with a conversational tenant intake flow, voice support, and a management dashboard for property managers and owners. Currently the voice chat seems to not be working

## Overview

Ranting Chant is a full-stack property management solution that enables:

- **Tenants** to report issues through natural conversation, with optional voice input.
- **Managers and owners** to review, filter, approve, and resolve tenant requests.
- **AI-assisted triage** using canonical request types, urgency, sentiment, confidence, and escalation signals.
- **Notifications** through email and SMS services for request creation and urgent escalation.
- **Vendor coordination** through service-category lookups and emergency vendor support.

## Architecture

The project has two main applications:

- **Backend** (`/backend`) - FastAPI REST API with AI classification, conversation orchestration, voice services, JSON-backed mock data (runtime), PostgreSQL schema definitions (`backend/src/resources/db/migrations/`), MCP-style tools, and notifications.
- **Frontend** (`/frontend`) - React 19 + TypeScript app using Vite, TanStack Router, Tailwind v4, shadcn/ui, and a Frutiger Aero design system.

## Data Flow Workflow

This is the high-level flow of data through the app, from login to request resolution.

```text
User login
  -> Frontend AppContext stores tenant / manager / owner session
  -> Route guards allow access to role-specific screens

Tenant starts chat
  -> POST /conversation/start
  -> Backend looks up tenant + property context
  -> Frontend receives a session_id and greeting

Tenant sends message
  -> POST /conversation/message
  -> ConversationEngine builds tenant/property/request context
  -> Gemini returns structured JSON:
       reply, is_complete, type, urgency, sentiment, confidence, escalate,
       involved_party_types, vendor_service_needed, suggested_contacts
  -> Backend normalizes type to the canonical request taxonomy
  -> Backend returns AI reply + request metadata + suggested contacts to the frontend
  -> Frontend displays suggested contacts with toggles for user confirmation
  -> User confirms contacts -> POST /conversation/send-notifications
  -> Backend dispatches email/SMS notifications via Resend/Twilio MCP tools

Request is saved or updated
  -> If the user chooses End & Save, frontend calls POST /conversation/save-conversation
  -> Backend creates a request record in mock JSON storage
  -> Request stores conversation history, type, urgency, status, escalation state,
     property_id, involved parties, vendor_id, notifications, and summary data
     (PostgreSQL schema also defines request_attachments, request_status_history,
     and request_assignments for production use — see backend/src/resources/README.md)
  -> Frontend clears cached tenant request data so dashboards refresh

Notifications and vendor routing
  -> User can trigger request notifications from the chat flow
  -> Backend dispatches manager/owner/vendor notifications through email/SMS services
  -> Vendor matching uses vendor service categories when vendor_service_needed is present

Manager or owner reviews requests
  -> Frontend calls GET /requests
  -> Management dashboard filters requests by managed_properties or owned_properties
  -> Manager/owner filters by type, status, urgency, and property
  -> Detail panel can fetch GET /requests/{id}/summary for an AI summary
  -> Detail panel shows detailed notification history (recipient, type, timestamp)
  -> Manager/owner can complete requests with optional resolution note via POST /requests/{id}/complete
  -> Resolution notes are stored and displayed in a separate Resolution section
  -> Pending approval requests can be approved with PATCH /requests/{id}
```

Voice follows the same request flow with two extra steps:

```text
Tenant records audio
  -> POST /voice/transcribe converts audio to text
  -> POST /voice/respond sends transcript through ConversationEngine
  -> Backend returns text reply, audio reply, status, type, urgency, and escalation state
```

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
- MCP-style tools for sending email and SMS notifications via Resend and Twilio.
- AI-suggested contacts for notifications with user confirmation flow.
- Request completion endpoint with optional resolution note stored separately.
- JSON-backed mock data through `json_store` (current runtime persistence).
- PostgreSQL migrations in `src/resources/db/migrations/` — base schema, RLS, seed data, and production hardening (soft delete, units, audit tables, `user_accounts`).
- Rate limiting, logging, validation, and Docker support.

### Frontend

- Login flow for tenants, managers, and owners.
- Authenticated layout with shared header, role-aware navigation, avatar, and client-side logout.
- Route guards for `/chat`, `/dashboard`, `/management`, `/vendors`, and `/profile`.
- Tenant chat flow with text and voice input.
- AI-suggested contacts display with toggles and Send button for notification confirmation.
- Tenant request dashboard with expandable timelines and cancel request functionality.
- Tenant profile page with editable email/phone and property representative contact info.
- Management dashboard with stats, filters, sortable table, AI summaries, and request approval.
- Management tabs for Requests, Properties, Tenants, Vendors, and Profile.
- Request detail panel with detailed notification history (recipient, type, timestamp).
- Request completion dialog for managers/owners with optional resolution note.
- Resolution section displays resolution note, date, and resolver when request is resolved.
- Properties management with create/edit forms and tenant listings.
- Tenant management with create/edit forms and request history.
- Vendor directory with search, service filtering, and role-aware CRUD for managers/owners.
- Vendor management with create/edit/delete capabilities for managers/owners.
- Manager/owner profile page with editable email/phone and managed/owned properties.
- Request cancellation for tenants and request completion for managers/owners with resolution notes.
- Canonical request type labels, badges, and management filtering.
- API service with typed request, conversation, voice, CRUD, and directory calls.

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
|   |   |   |-- db/migrations/    # PostgreSQL schema (001–004)
|   |   |   |-- mock_db_jsons/    # Runtime mock data
|   |   |   `-- README.md         # Schema & data reference
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
- Database schema & mock data: `backend/src/resources/README.md`
- Frontend details: `frontend/README.md`
- Product and integration docs: `documentation/`

## Data Model

Runtime APIs use denormalized JSON (`property_id` + `unit` on tenants, `tenant_ids` on properties). The PostgreSQL schema normalizes this for production:

- Tenants belong to **units**; property is derived via `tenant → unit → property`
- Core entities use **soft delete** (`is_active`, `deleted_at`)
- Requests keep **status history**, **vendor assignment history**, and **file attachments** in dedicated tables
- `requests.vendor_id` holds the current vendor; `request_assignments` stores full history

Apply migrations `001` through `004` in order. Details: `backend/src/resources/README.md`.

## License

This project is provided as-is for educational and development purposes.
