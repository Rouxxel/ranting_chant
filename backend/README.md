# Ranting Chant Backend

FastAPI backend for Ranting Chant, an AI-assisted property operations platform. The backend owns request intake, request classification, voice services, notification dispatch, MCP-style data tools, and JSON-backed mock persistence. Production-ready PostgreSQL schema definitions live in `src/resources/db/migrations/` (see `src/resources/README.md`).

## Features

- **FastAPI API** for tenants, properties, vendors, managers, owners, requests, conversations, voice, and MCP tools.
- **AI conversation engine** backed by Google Gemini for tenant intake and follow-up questions.
- **Standalone classifier** for classifying completed conversations.
- **Canonical request type taxonomy** enforced in models, prompts, classifier parsing, request creation, and request updates.
- **Voice services** for audio transcription and text-to-speech responses.
- **Notifications** through Resend email and Twilio SMS.
- **MCP-style tools** for property, tenant, vendor, request, and notification workflows.
- **AI-suggested contacts** for notifications with user confirmation flow.
- **Request completion endpoint** with optional resolution note stored separately.
- **JSON mock data store** with per-collection locking (current runtime persistence).
- **PostgreSQL schema** — migrations for entities, units, soft delete, request audit tables, RLS, and seed data.
- **Rate limiting**, structured logging, Pydantic validation, and Docker support.

## Quick Start

### Run with Python

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

### Run with Docker

```bash
cd backend
docker-compose up --build
```

Or build manually:

```bash
docker build -t ranting-chant-backend .
docker run -p 8000:8000 --env-file .env ranting-chant-backend
```

## Environment

Create `backend/.env` from `.env.example` and configure the services you want enabled.

```bash
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

# Logging
LOG_LEVEL=info
```

## Request Types

The request taxonomy lives in `src/models/request.py` and is used by:

- Pydantic request models
- `src/ai/system_prompt.py`
- `src/ai/classifier.py`
- `src/ai/conversation_engine.py`
- `src/mcp/request_mcp.py`
- request API create/update payloads
- notification labels
- mock request data

Supported canonical values:

| Type | Meaning |
|---|---|
| `plumbing` | Leaks, clogged drains, water pressure, fixtures, or pipe issues |
| `electrical` | Outlets, lights, breakers, wiring, or power loss |
| `hvac` | Heating, cooling, ventilation, or thermostat issues |
| `appliance` | Dishwasher, refrigerator, washer, dryer, stove, or appliance repairs |
| `pest_control` | Insects, rodents, or suspected infestations |
| `lockout` | Tenant is locked out or needs immediate entry assistance |
| `access_control` | Keys, fobs, gates, intercoms, doors, or building access issues |
| `noise` | Noise complaints or neighbor disturbance reports |
| `lease_question` | Lease terms, renewals, notices, or agreement questions |
| `rent_payment` | Rent, utility charges, balances, payment questions, or billing |
| `emergency` | Immediate safety threats such as fire, gas leak, flood, break-in, or danger |
| `general` | Any other inquiry that does not fit the supported categories |

Legacy values are normalized by `normalize_request_type()`:

| Legacy value | Canonical value |
|---|---|
| `maintenance` | `general` |
| `access` | `access_control` |
| `rental_agreement` | `lease_question` |
| `complaint` | `noise` |
| `billing` | `rent_payment` |

## API Areas

The backend includes routers for:

- **Root**: health and basic API status
- **Tenants**: tenant reads, create, update, and profile update
- **Properties**: property reads, create, and update
- **Vendors**: vendor reads, create, update, delete, and service-category lookup
- **Managers**: manager reads and profile update
- **Owners**: owner reads and profile update
- **Requests**: request listing, detail, summary, create, update, cancel, complete, and notification dispatch
- **Conversation**: AI-powered chat sessions, message processing, history, save-conversation, and send-notifications
- **Voice**: transcription, voice session start, and voice response
- **MCP**: tool discovery and MCP-style operations (property, tenant, vendor, request, notification)

## Data & Persistence

The backend currently reads and writes through `src/utils/json_store.py` against `src/resources/mock_db_jsons/`. Routers, MCP tools, and notifications use the denormalized JSON shape (e.g. `tenants.property_id` + `unit`, `properties.tenant_ids`).

PostgreSQL schema for production is defined separately under `src/resources/db/migrations/`:

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema.sql` | Base tables, enums, auth mapping, normalized units, resolution fields |
| `002_rls_policies.sql` | Row Level Security policies and auth helpers |
| `003_seed_data.sql` | Normalized seed data generated from mock JSON |
| `004_schema_hardening.sql` | Indexes, request audit tables, attachments, assignment history |

Apply migrations in numeric order against PostgreSQL. Full table definitions, entity relationships, JSON-to-SQL mapping, and deletion strategy: **`src/resources/README.md`**.

**Schema highlights:**

- Soft delete (`is_active`, `deleted_at`) on core entities
- `units` table; tenants link via `unit_id` (property derived: tenant → unit → property)
- `request_attachments`, `request_status_history`, `request_assignments` for files, status audit, and vendor assignment history
- `user_accounts` maps Supabase Auth users to owner/manager actors
- `ON DELETE RESTRICT` on `requests.requester_id` to preserve history

Mock JSON files are unchanged and still match the runtime API. SQL seeding normalizes tenants from JSON `property_id` + `unit` into `units` plus `tenants.unit_id`.

## Project Structure

```text
backend/
|-- src/
|   |-- ai/
|   |   |-- classifier.py
|   |   |-- conversation_engine.py
|   |   |-- gemini_client.py
|   |   `-- system_prompt.py
|   |-- api_endpoints/
|   |   `-- routers/
|   |-- core_specs/
|   |-- mcp/
|   |-- models/
|   |   `-- request.py
|   |-- notifications/
|   |-- resources/
|   |   |-- db/migrations/       # PostgreSQL schema (001–004)
|   |   |-- mock_db_jsons/       # Runtime mock data
|   |   `-- README.md            # Schema & data reference
|   |-- utils/
|   `-- voice/
|-- tests/
|-- main.py
|-- requirements.txt
|-- docker-compose.yml
`-- README.md
```

## Tests

Run all backend tests:

```bash
pytest tests/
```

Run the conversation engine tests:

```bash
pytest tests/test_conversation_engine.py
```

## Adding Endpoints

1. Create a router in `src/api_endpoints/routers/`.
2. Add Pydantic models in `src/models/` when the request or response shape is shared.
3. Register the router in `main.py`.
4. Add route and rate-limit configuration in `src/core_specs/configuration/config_file.json` if the endpoint follows configured routes.

Example:

```python
from fastapi import APIRouter, Request
from src.utils.limiter import limiter

router = APIRouter(prefix="/api/v1", tags=["example"])

@router.get("/example")
@limiter.limit("10/minute")
async def example_endpoint(request: Request):
    return {"message": "Example response"}
```

## Notes

- Request types should be added in `src/models/request.py` first, then mirrored in `frontend/src/types/index.ts`.
- The conversation and classifier prompts are generated from the backend request type definitions.
- The JSON mock data in `src/resources/mock_db_jsons/requests.json` should always use canonical request type values.
- The `notifications_sent` field in mock data uses a detailed format: `[{type, recipient, status, timestamp}]` instead of simple ID strings.
- Backend authentication is not implemented yet; frontend logout is currently client-side only. The `user_accounts` table in `001_initial_schema.sql` is ready for owner/manager Supabase auth integration.
- When migrating runtime code from JSON to PostgreSQL, follow `src/resources/README.md` for the canonical schema; do not mirror SQL-only tables (`request_status_history`, `request_assignments`) in mock JSON until the API layer supports them.

## Google Cloud OAuth Setup (Future)

When implementing Google Cloud OAuth for authentication, follow this checklist:

### Google Cloud Console Setup

1. **Create OAuth 2.0 Client ID**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Create credentials → OAuth client ID
   - Application type: Web application
   - Name: Ranting Chant Backend

2. **Configure Authorized Redirect URIs**
   - Add your backend callback URL: `https://your-backend-domain.com/auth/callback`
   - Add local development URL: `http://localhost:8000/auth/callback`

3. **Configure Authorized JavaScript Origins**
   - Add your frontend domain: `https://your-frontend-domain.com`
   - Add local development URL: `http://localhost:5173`

4. **Copy Client ID and Client Secret**
   - Store these securely in environment variables

### Environment Variables

Add to `backend/.env`:

```bash
# Google Cloud OAuth
GOOGLE_OAUTH_CLIENT_ID=your_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_OAUTH_REDIRECT_URI=https://your-backend-domain.com/auth/callback
```

### Frontend Environment Variables

Add to `frontend/.env`:

```bash
# OAuth Configuration
VITE_GOOGLE_OAUTH_CLIENT_ID=your_oauth_client_id
VITE_GOOGLE_OAUTH_REDIRECT_URI=https://your-frontend-domain.com/auth/callback
```

### Required Redirect URIs

For production deployment:
- Backend callback: `https://your-backend-domain.com/auth/callback`
- Frontend origin: `https://your-frontend-domain.com`

For local development:
- Backend callback: `http://localhost:8000/auth/callback`
- Frontend origin: `http://localhost:5173`

## License

This backend is provided as-is for educational and development purposes.
