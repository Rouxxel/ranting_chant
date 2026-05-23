# Ranting Chant — Product Requirements Document (PRD)

**Version:** 1.0.0 — MVP / Hackathon  
**Date:** May 2026  
**Author:** Sebastian Russo

---

## 1. Product Overview

Ranting Chant is an AI-powered property operations platform that acts as an autonomous coordination layer between tenants, property management companies, property owners, and third-party service vendors.

Rather than functioning as a passive chatbot, Ranting Chant behaves as an AI operations coordinator. It conducts intelligent, multi-turn conversations to gather all necessary operational context before routing, escalating, or resolving a request.

The system is built backend-first. The FastAPI backend is the complete operational brain — AI reasoning, MCP tools, notifications, and voice processing all live there. The React frontend is a thin client that consumes the backend APIs.

---

## 2. Problem Statement

Property management operations are fragmented. Tenants submit vague requests. Managers spend time chasing context. Vendors get dispatched without enough information. Owners are looped in too late or too early.

Ranting Chant eliminates this friction by acting as the intelligent front desk — gathering context, classifying requests, routing to the right stakeholders, and tracking everything end-to-end.

---

## 3. Goals & Success Criteria

### MVP Goals
- Tenant can submit a request via text or voice and receive intelligent follow-up questions
- AI classifies request type, urgency, and involved stakeholders automatically
- Requests are persisted in JSON storage with full conversation history
- Property manager receives a notification (email via Resend, SMS via Twilio) when a request is created or escalated
- ElevenLabs handles both TTS (voice responses) and STT (transcription)
- Frontend dashboard shows active requests with status, urgency, and stakeholder info

### Success Criteria
- A tenant can go from "I lost my key" to a fully classified, routed request in under 2 minutes
- The AI asks no more than 5 follow-up questions before routing
- Emergency requests trigger immediate escalation with no manual intervention
- The demo is fully functional end-to-end without a live database

---

## 4. Stakeholders

| Role | Capabilities |
|---|---|
| **Tenant** | Submit requests (text/voice), track status, receive updates |
| **Property Manager** | Monitor requests, review escalations, approve workflows, view dashboard |
| **Property Owner** | Receive high-priority notifications, approve sensitive actions |
| **Vendor** | Receive dispatch notifications (email/SMS), update request status |

---

## 5. Supported Request Types

| Category | Examples |
|---|---|
| Maintenance | Plumbing, HVAC, electrical, appliance repair, water leaks |
| Access | Lost key, stolen key, lockout, lock replacement, access code reset |
| Rental Agreement | Lease extension, add/remove tenant, early termination, pet approval |
| Emergency | Flooding, gas leak, fire hazard, security concerns |
| General | Noise complaints, general inquiries |

---

## 6. Core Features

### 6.1 Conversational AI Intake
- Multi-turn conversation engine powered by Gemini (`gemini-2.5-flash`)
- AI asks follow-up questions until sufficient operational context is gathered
- Conversation history stored per request in `requests.json`
- Supports both text input (REST) and voice input (audio upload → STT → same pipeline)

### 6.2 Request Classification
- Gemini classifies: request type, urgency (low / medium / high), sentiment, escalation necessity, confidence score
- Classification result drives all downstream routing logic
- Output is structured JSON parsed from Gemini response

### 6.3 Escalation Logic
- Auto-escalates when: urgency is `high`, confidence < 0.7, safety risk detected, sentiment is `angry`
- Escalated requests immediately notify property manager and/or owner
- Emergency requests (flooding, gas leak, fire) skip the follow-up loop and escalate on first message

### 6.4 Stakeholder Routing
- AI determines which parties need to be involved per request type
- Vendor matching by service category (e.g., `plumbing` → AquaFlow Plumbing, `locksmith` → QuickFix Locksmith)
- Notifications dispatched via Resend (email) and Twilio (SMS)

### 6.5 Voice Layer (ElevenLabs)
- STT: ElevenLabs Scribe v2 (`scribe_v2`) transcribes tenant audio uploads
- TTS: ElevenLabs `eleven_v3` model converts AI text replies to audio
- Fallback STT: Faster-Whisper (`base` model) if ElevenLabs STT is unavailable
- Voice conversation state is synced to the same backend workflow engine as text
- Emergency escalation mode shifts TTS tone via prompt prefix

### 6.6 MCP Tool Layer
- Structured Python functions acting as MCP tools: tenant lookup, property lookup, vendor lookup, request CRUD, notification dispatch
- Called by the Gemini reasoning engine after classification to persist state and fetch context
- All tools read/write the JSON data store

### 6.7 Notification Layer
- **Email (Resend):** request created, escalation alert, vendor dispatch
- **SMS (Twilio):** emergency alerts, high-urgency vendor dispatch
- **Simulation mode:** if API keys are missing, notifications are logged as events in `requests.json` under `notifications_sent`

### 6.8 JSON-Based Storage (MVP)
- All data in `backend/src/resources/mock_db_jsons/`
- Files: `tenants.json`, `owners.json`, `property_magament.json`, `properties.json`, `vendors.json`, `requests.json`
- Thread-safe read/write utilities handle all persistence

---

## 7. Data Models

### tenants.json
```json
{
  "id": "tenant_001",
  "name": "John Tenant",
  "email": "john@example.com",
  "phone": "+1-555-1234",
  "address": "123 Main St Apt 4B",
  "property_id": "property_001"
}
```

### property_magament.json
```json
{
  "id": "manager_001",
  "name": "John Management",
  "email": "sarah@management.com",
  "phone": "+1-555-2222",
  "managed_properties": ["property_001"]
}
```

### owners.json
```json
{
  "id": "owner_001",
  "name": "John Owner",
  "email": "owner@example.com",
  "phone": "+1-555-3333",
  "property_id": "property_001"
}
```

### vendors.json
```json
{
  "id": "vendor_001",
  "name": "QuickFix Locksmith",
  "email": "dispatch@quickfix.com",
  "phone": "+1-555-4444",
  "services": ["locksmith"],
  "emergency_available": true
}
```

### properties.json
```json
{
  "id": "property_001",
  "name": "Sunset Apartments",
  "address": "123 Main St, Berlin, 10115, Germany",
  "year_built": 1998,
  "property_type": "apartment_building",
  "unit_count": 24,
  "owner_id": "owner_001",
  "manager_id": "manager_001",
  "tenant_ids": ["tenant_001", "tenant_002", "tenant_009"],
  "representative": { "type": "property_manager", "id": "manager_001" }
}
```

### requests.json
```json
{
  "id": "request_001",
  "requester_id": "tenant_001",
  "type": "key_replacement",
  "description": "Tenant lost front door key",
  "status": "pending",
  "urgency": "low",
  "escalated": false,
  "sentiment": "neutral",
  "confidence": 0.9,
  "involved_parties": ["tenant_001", "manager_001"],
  "vendor_id": null,
  "conversation_history": [
    { "role": "tenant", "message": "I lost my key", "timestamp": "2026-05-23T12:00:00" },
    { "role": "ai", "message": "Was the key lost or stolen?", "timestamp": "2026-05-23T12:00:05" }
  ],
  "notifications_sent": [
    { "type": "email", "recipient": "sarah@management.com", "timestamp": "2026-05-23T12:01:00", "simulated": false }
  ],
  "created_at": "2026-05-23T12:00:00",
  "updated_at": "2026-05-23T12:01:00"
}
```

---

## 8. AI Pipeline

```
Voice/Text Input
      ↓
[If voice] ElevenLabs STT (scribe_v2) → transcript
[Fallback] Faster-Whisper (base model) → transcript
      ↓
Conversation State Tracking (conversation_history in request)
      ↓
Gemini LLM (gemini-2.5-flash)
      ↓
Follow-Up Question  OR  Workflow Classification (JSON output)
      ↓
MCP Tool Execution (Tenant / Property / Vendor / Request)
      ↓
Notification Dispatch (Resend email + Twilio SMS)
      ↓
[If voice] ElevenLabs TTS (eleven_v3) → audio response
      ↓
API response to frontend (text reply + optional audio_base64)
```

---

## 9. MCP Tools

| Module | Tools |
|---|---|
| `tenant_mcp` | `lookup_tenant`, `get_tenant_by_name_and_unit`, `get_tenant_property` |
| `property_mcp` | `lookup_property`, `get_property_manager`, `get_property_owner` |
| `vendor_mcp` | `find_vendors_by_service`, `get_emergency_vendors`, `get_vendor` |
| `request_mcp` | `create_request`, `update_request`, `get_request`, `list_requests_by_tenant`, `list_all_requests`, `escalate_request` |
| `notification_mcp` | `send_email`, `send_sms`, `log_notification` |

---

## 10. External APIs & Credentials

All API keys are already configured in `backend/.env`.

| Service | SDK | Purpose |
|---|---|---|
| Gemini (`google-genai==1.72.0`) | `google.genai.Client` | LLM reasoning, classification, follow-up generation |
| ElevenLabs (`elevenlabs==2.49.0`) | `ElevenLabs` client | TTS voice responses + STT transcription |
| Resend (`resend==2.30.1`) | `resend.Emails.send` | Email notifications |
| Twilio (`twilio==9.10.9`) | `twilio.rest.Client` | SMS emergency alerts |

Simulation mode activates automatically for any service whose key is absent.

---

## 11. Backend API Surface

### Conversation
| Method | Endpoint | Description |
|---|---|---|
| POST | `/conversation/start` | Create request, return greeting |
| POST | `/conversation/message` | Send message, get AI reply |
| GET | `/conversation/{request_id}/history` | Full conversation history |

### Requests
| Method | Endpoint | Description |
|---|---|---|
| GET | `/requests` | List all requests (optional `?tenant_id=`) |
| GET | `/requests/{id}` | Get single request |
| POST | `/requests` | Create request directly |
| PATCH | `/requests/{id}` | Update request status/fields |
| GET | `/requests/{id}/notifications` | Notification history |
| GET | `/requests/{id}/summary` | AI-generated plain-English summary |

### Voice
| Method | Endpoint | Description |
|---|---|---|
| POST | `/voice/transcribe` | Upload audio, get transcript |
| POST | `/voice/respond` | Transcript in, AI reply + audio out |
| POST | `/voice/start` | Start voice session, get greeting audio |

### Data
| Method | Endpoint | Description |
|---|---|---|
| GET | `/tenants` | List tenants |
| GET | `/tenants/{id}` | Get tenant |
| GET | `/properties` | List properties |
| GET | `/properties/{id}` | Get property |
| GET | `/vendors` | List vendors |
| GET | `/vendors/by-service/{service}` | Filter vendors by service |
| GET | `/managers` | List property managers |
| GET | `/mcp/tools` | List all MCP tools (debug) |

---

## 12. Frontend Pages

### Page 1 — Login (Mock)
- Tenant enters name + apartment/unit number
- Resolves to a tenant record via `GET /tenants`; no real auth

### Page 2 — Chat / Inquiry Page
- Text chat with AI, voice mode toggle
- Calls `POST /conversation/start` on load, `POST /conversation/message` per turn
- Voice: records audio → `POST /voice/respond` → plays returned audio
- Shows escalation banner when `status === "escalated"`

### Page 3 — Tenant Request Dashboard
- Lists tenant's requests via `GET /requests?tenant_id={id}`
- Status/urgency badges, conversation timeline, notification history

### Page 4 — Property Management Dashboard
- All requests for managed properties
- Filter by status/urgency/property
- Escalated requests highlighted
- AI summary panel via `GET /requests/{id}/summary`
- Approve button for `pending_approval` requests

---

## 13. Tech Stack

### Backend (build first)
- FastAPI + Python
- `google-genai` — Gemini
- `elevenlabs` — TTS + STT
- `resend` — email
- `twilio` — SMS
- `faster-whisper` — STT fallback
- `pydantic` — data models
- `slowapi` — rate limiting
- `uvicorn` — ASGI server
- JSON file storage

### Frontend (wire after backend is complete)
- React + TypeScript + Vite
- TailwindCSS + shadcn/ui
- Axios
- react-router-dom

### Deployment
- Backend: Render
- Frontend: Vercel

---

## 14. Out of Scope (MVP)

- Real authentication / JWT
- PostgreSQL / Supabase
- Multi-property manager accounts
- Role-based access control
- SLA tracking / analytics
- Vendor scheduling calendar
- Automated outbound calling

---

## 15. Future Roadmap

- Database migration to PostgreSQL / Supabase
- Real authentication with role-based access
- Multi-property support
- Vendor scheduling and SLA tracking
- Full MCP ecosystem expansion
- Automated voice calling via Twilio
- Analytics and reporting dashboard
