# Ranting chant — AI Property Operations Agent

## Overview

Ranting chant is an AI-powered property operations platform designed to automate communication and coordination between:

- Tenants
- Property management companies
- Property owners
- Third-party service providers

The system acts as an autonomous operational layer that handles:

- Tenant inquiries
- Maintenance coordination
- Rental agreement requests
- Vendor dispatching
- Information gathering
- Escalation workflows
- Status tracking

Instead of simply functioning as a chatbot, Ranting chant behaves like an AI operations coordinator capable of conducting intelligent back-and-forth conversations to collect all information necessary to complete operational workflows.

---

# Core Concept

The system dynamically gathers information through conversational AI.

Example:

Tenant:
> "I need a new key."

The AI does NOT immediately escalate.

Instead, it continues gathering operational context:

- Was the key lost or stolen?
- Which key was lost?
- Is this an emergency?
- Does the lock need replacement?
- Is the tenant responsible for payment?

After sufficient information is collected, the system determines:

- Whether a property manager must approve the request
- Whether a locksmith should be contacted
- Whether emergency escalation is needed
- Whether contact information should be provided directly
- Whether payment responsibility exists

This creates a true AI-powered operational workflow engine.

---

# Main Stakeholders

## 1. Tenant

Can:
- Submit maintenance requests
- Request lease/rental modifications
- Report emergencies
- Ask operational questions
- Upload voice or text inquiries
- Track request status

---

## 2. Property Management Company

Can:
- Monitor requests
- Review escalations
- Approve workflows
- Receive AI-generated summaries
- Track vendor coordination
- View operational dashboards

---

## 3. Property Owner

Can:
- Receive important notifications
- Review high-priority requests
- Approve sensitive actions
- Monitor property activity

---

## 4. Third-Party Service Providers

Examples:
- Locksmiths
- Plumbers
- Electricians
- HVAC technicians
- Handymen

Can:
- Receive automated requests
- Receive scheduling information
- Update request status
- Coordinate service completion

---

# System Workflow

## High-Level Flow

```txt
Tenant submits inquiry
        ↓
AI gathers missing information
        ↓
AI classifies request type
        ↓
AI determines urgency
        ↓
AI determines involved stakeholders
        ↓
AI routes workflow
        ↓
Notifications / vendor coordination / escalation
        ↓
Status tracking and updates
```

---

# Supported Request Types

## Maintenance Requests

Examples:
- Plumbing
- HVAC
- Electrical
- Appliance repair
- Water leaks

---

## Access Requests

Examples:
- New key request
- Lost key
- Stolen key
- Lock replacement
- Access code reset

---

## Rental Agreement Requests

Examples:
- Add tenant
- Remove tenant
- Extend lease
- Early termination request
- Pet approval request

---

## Emergency Requests

Examples:
- Flooding
- Gas leak
- Fire hazard
- Security concerns

---

# Conversational AI Workflow

The system is designed around dynamic follow-up questioning.

---

## Example — New Key Request

Tenant:
> "I need a replacement key."

AI:
> "Was the key lost or stolen?"

Tenant:
> "Lost."

AI:
> "Was it only the front door key or were other keys attached?"

Tenant:
> "Only the front door."

AI:
> "Do you still have access to the property?"

Tenant:
> "Yes."

AI then determines:
- Non-emergency request
- Locksmith not immediately required
- Tenant likely responsible for replacement cost
- Property management should be notified

The AI creates:
- Request summary
- Recommended workflow
- Relevant stakeholder notifications

---

# AI Workflow Engine

The AI system performs several operational tasks.

---

## 1. Information Gathering

The AI asks follow-up questions until enough operational context exists.

Examples:
- urgency
- safety concerns
- responsibility determination
- stakeholder involvement
- vendor necessity

---

## 2. Classification

The AI classifies:
- request category
- urgency
- sentiment
- escalation necessity

---

## 3. Stakeholder Routing

The AI determines:
- who needs to be involved
- who should receive updates
- whether vendor dispatch is required

---

## 4. Escalation Logic

The AI escalates when:
- issue is dangerous
- issue is legally sensitive
- confidence is low
- tenant sentiment is highly negative
- emergency conditions exist

---

# MCP-Based Architecture

MCPs (Model Context Protocol servers/tools) are useful because the AI system needs structured operational tools and memory.

The AI needs the ability to:
- retrieve tenant data
- retrieve property information
- retrieve vendor lists
- create/update requests
- track workflow state
- send notifications

Instead of relying only on prompts, MCP tools provide structured operational capabilities.

---

# Suggested MCP Tools

## Tenant MCP

Handles:
- tenant lookup
- lease information
- contact details
- apartment/unit data

---

## Property MCP

Handles:
- property information
- ownership information
- management assignments
- property metadata

---

## Vendor MCP

Handles:
- vendor lookup
- service categories
- contact information
- availability
- emergency providers

---

## Request MCP

Handles:
- request creation
- request updates
- workflow tracking
- escalation tracking
- status changes

---

# Simplified MVP Data Storage

For MVP purposes, the system will use local JSON files instead of a full database.

Advantages:
- faster development
- easier debugging
- no infrastructure setup
- hackathon-friendly

Later versions can migrate to PostgreSQL or Supabase.

---

# Suggested JSON Data Structure

## tenants.json

```json
[
  {
    "id": "tenant_001",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-1234",
    "address": "123 Main St Apt 4B",
    "property_id": "property_001"
  }
]
```

---

## property_managers.json

```json
[
  {
    "id": "manager_001",
    "name": "Sarah Johnson",
    "email": "sarah@management.com",
    "phone": "+1-555-2222",
    "managed_properties": ["property_001"]
  }
]
```

---

## owners.json

```json
[
  {
    "id": "owner_001",
    "name": "Michael Smith",
    "email": "owner@example.com",
    "phone": "+1-555-3333",
    "property_id": "property_001"
  }
]
```

---

## vendors.json

```json
[
  {
    "id": "vendor_001",
    "name": "QuickFix Locksmith",
    "email": "dispatch@quickfix.com",
    "phone": "+1-555-4444",
    "services": ["locksmith"],
    "emergency_available": true
  }
]
```

---

## requests.json

```json
[
  {
    "id": "request_001",
    "requester_id": "tenant_001",
    "type": "key_replacement",
    "description": "Tenant lost front door key",
    "status": "pending",
    "urgency": "low",
    "involved_parties": [
      "tenant_001",
      "manager_001"
    ],
    "conversation_history": [],
    "created_at": "2026-05-23T12:00:00"
  }
]
```

## properties.json
```json
[
  {
    "id": "property_001",
    "name": "Sunset Apartments",
    "address": "123 Main St, Berlin, 10115, Germany",
    "year_built": 1998,
    "property_type": "apartment_building",
    "unit_count": 24,

    "owner_id": "owner_001",
    "manager_id": "manager_001",
    "tenant_ids": ["tenant_001","tenant_002","tenant_009"],

    "representative": {
      "type": "property_manager",
      "id": "manager_001"
    },
  }
]
```

---

# ElevenLabs Voice Agent Integration

Ranting chant uses ElevenLabs to power a real-time conversational voice agent that interacts directly with tenants.

This transforms the system from a text-based intake tool into a fully interactive AI operations assistant.

---

## Role of the Voice Agent

The ElevenLabs voice agent acts as the **front-line interface** for tenant communication.

It is responsible for:

- Conversational intake of tenant requests
- Asking follow-up clarification questions
- Gathering missing operational context in real time
- Providing updates on request status
- Handling emergency scenarios with natural dialogue
- Reducing friction compared to text-only interaction

---

## Voice-Based Workflow

### 1. Tenant Initiates Voice Request

Tenant speaks:

> “My sink is leaking everywhere.”

---

### 2. ElevenLabs Agent Responds Immediately

> “I’m sorry to hear that. Is the water actively flooding the area right now?”

---

### 3. Context Gathering Loop

The agent continues asking clarifying questions such as:

- severity of issue
- safety risks
- access constraints
- urgency level
- type of service needed

---

### 4. Backend Trigger Point

Once enough context is collected:

- audio is transcribed (if needed)
- conversation state is stored
- LLM classification is triggered
- workflow engine activates

---

### 5. Voice Feedback Loop

The agent provides real-time updates:

> “A plumber has been contacted and is expected between 2–4 PM today.”

---

### 6. Emergency Escalation Mode

For critical issues, the agent shifts tone:

> “This seems urgent. I’ve immediately notified your property manager. If safe, please shut off the water supply.”

---

## Why ElevenLabs is Critical

ElevenLabs enables:

- natural conversational UX instead of forms
- faster information gathering through dialogue
- higher-quality tenant interaction experience
- stronger hackathon demo impact
- true multi-modal system (voice + AI + automation)

---

## System Architecture Integration

```txt
Tenant Voice Input
        ↓
ElevenLabs Voice Agent (real-time conversation)
        ↓
Conversation state captured
        ↓
Speech-to-text (if needed)
        ↓
Gemini LLM reasoning engine
        ↓
MCP tools + workflow engine
        ↓
Backend automation (vendors, managers, owners)
        ↓
ElevenLabs response back to tenant
```

---

## Key Design Insight

ElevenLabs is NOT just an input layer.

It acts as the **real-time operational front desk agent**, while the FastAPI + LLM backend acts as the **decision-making engine**.

# Frontend Architecture

## Tech Stack

- React
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui

Deployment:
- Vercel

---

# Backend Architecture

## Tech Stack

- FastAPI
- Python
- JSON-based storage for MVP
- MCP integrations
- Gemini API
- Faster-Whisper

Deployment:
- Render

---

# AI Pipeline

```txt
Voice/Text Input
        ↓
ElevenLabs Voice Agent (optional real-time interaction layer)
        ↓
Speech-to-Text (Faster-Whisper or native transcript)
        ↓
Conversation State Tracking
        ↓
Gemini LLM
        ↓
Dynamic Follow-Up Questions (or handled via ElevenLabs agent)
        ↓
Workflow Classification
        ↓
MCP Tool Execution (Tenant / Property / Vendor / Request)
        ↓
Notifications / Escalation / Vendor Dispatch
        ↓
ElevenLabs Voice Response (if voice mode is active)
```

---

# Speech-to-Text

## Recommended Library

### Faster-Whisper

Example:

```python
from faster_whisper import WhisperModel

model = WhisperModel("base")

segments, info = model.transcribe("audio.mp3")

transcript = ""

for segment in segments:
    transcript += segment.text
```

---

# Example LLM Prompt

```txt
You are an AI property operations coordinator.

Your job is to gather enough information to complete operational workflows.

Determine:
- request type
- urgency
- whether follow-up questions are needed
- which stakeholders are involved
- whether a third-party provider is required
- whether escalation is necessary

Current conversation:
Tenant: "I lost my apartment key."
```

---

# Required API Keys & External Services

Ranting chant relies on a small set of external APIs to enable AI reasoning, voice interaction, and communication automation.

---

## 1. Gemini API (Core Intelligence Layer)

The Gemini API is the **brain of the system**.

It is responsible for:

- request classification (maintenance, access, emergency, etc.)
- urgency detection
- sentiment analysis
- follow-up question generation
- escalation decisions
- workflow routing logic

Without Gemini, Ranting chant cannot function as an autonomous operations coordinator.

### Required:
- Gemini API key

---

## 2. ElevenLabs API (Voice Agent Layer)

ElevenLabs powers the real-time conversational voice interface.

It is responsible for:

- tenant voice conversations
- AI voice responses
- dynamic follow-up questioning via speech
- emergency voice escalation handling
- natural language interaction layer

### Required:
- ElevenLabs API key

---

## 3. Email Notifications Layer

Used to notify:

- property managers
- property owners
- vendors

Typical use cases:

- maintenance request created
- escalation triggered
- vendor dispatch requests
- status updates

### Recommended Provider:
- :contentReference[oaicite:0]{index=0}

### Required:
- API key (or SMTP credentials if using raw Python email sending)

### Alternative (no API service required):
- Python `smtplib` with Gmail/Outlook credentials
- Requires email account + app password setup

---

## 4. SMS / Phone Notifications (Optional Escalation Layer)

Used for:

- emergency alerts (gas leak, flooding, fire hazard)
- high-priority vendor dispatch
- real-time tenant updates

### Recommended Provider:
- :contentReference[oaicite:1]{index=1}

### Required:
- Account SID
- Auth Token
- Verified phone numbers

### Optional:
- Can be fully simulated for MVP demos
- Not required for system functionality

---

## 🧠 Minimal Required Stack (Hackathon Version)

### 🔴 Required APIs
- Gemini API (intelligence engine)
- ElevenLabs API (voice agent)

### 🟡 Recommended
- Resend (email notifications)

### 🟢 Optional
- Twilio (SMS / emergency realism)

---

## ⚙️ Simulation Mode (MVP-Friendly)

For hackathon purposes, communication layers can be simulated:

- Emails → stored in backend + shown in dashboard
- SMS → logged as notification events
- Calls → represented as “call initiated” timeline entries

This allows full system functionality without external service setup complexity.

---

## 💡 Key Design Insight

Ranting chant separates responsibilities into modular layers:

- Gemini → reasoning and decision-making
- ElevenLabs → voice interaction layer
- Resend / Twilio → communication delivery
- FastAPI + JSON → system state + orchestration engine

This keeps the system scalable, modular, and demo-ready while avoiding overengineering.

---

# Suggested Frontend Pages

## 1. Login Page

Simple mock login:
- tenant name
- apartment/unit number

No real authentication required for MVP.

---

## 2. Inquiry Chat Page

Core conversational interface.

Supports:
- text messages
- voice recording
- AI follow-up questions
- conversation history

### Voice Mode (ElevenLabs Powered)

- real-time voice conversation with AI agent
- tenant can speak naturally instead of typing
- AI responds via voice instantly
- conversation is synced to backend workflow engine

---

## 3. Request Dashboard

Displays:
- active requests
- request status
- urgency
- involved stakeholders
- pending approvals
- vendor assignments

---

## 4. Property Management Dashboard

Displays:
- escalated issues
- emergency requests
- pending approvals
- vendor coordination status
- AI-generated summaries

---

# Suggested Folder Structure

## Frontend

```txt
src/
├── pages/
├── components/
├── hooks/
├── services/
├── types/
├── context/
└── App.tsx
```

---

# Example Workflow Types

## Workflow — Lost Key

```txt
Tenant reports lost key
        ↓
AI asks follow-up questions
        ↓
AI determines severity
        ↓
AI determines responsibility
        ↓
Property management notified
        ↓
Locksmith contacted if necessary
        ↓
Tenant updated
```

---

## Workflow — Lease Modification

```txt
Tenant requests lease modification
        ↓
AI gathers requested changes
        ↓
AI verifies required information
        ↓
Property management notified
        ↓
Owner approval requested if needed
        ↓
Tenant receives status updates
```

---

# Escalation Logic

The system escalates when:
- emergency conditions exist
- AI confidence is low
- legal/sensitive issues are detected
- tenant sentiment is highly negative
- workflow exceeds defined thresholds

Example:

```python
if urgency == "high":
    escalate = True

if confidence < 0.7:
    escalate = True

if sentiment == "angry":
    escalate = True
```

---

# Key Product Positioning

Ranting chant is NOT simply a chatbot.

It is:

> An autonomous AI-powered property operations coordination system.

The platform:
- gathers operational information
- coordinates stakeholders
- automates workflows
- routes requests intelligently
- tracks operational state
- escalates issues appropriately

---

# MVP Goals

## Must Have

- Conversational AI intake
- Voice recording
- Speech transcription
- Follow-up questioning
- ElevenLabs voice agent integration (core differentiator)
- JSON-based operational storage
- Request tracking
- Stakeholder routing
- Dashboard UI

---

## Nice To Have

- ElevenLabs voice agent
- Vendor auto-contacting
- Email notifications
- SMS notifications
- Sentiment analysis
- Real-time updates

---

# Future Improvements

## Planned Database Migration

Move from:
- JSON files

To:
- PostgreSQL
- Supabase

---

## Planned Features

- Real authentication
- Multi-property support
- Role-based access
- Vendor scheduling
- SLA tracking
- Analytics dashboard
- Automated voice calling
- Full MCP ecosystem

---

# Final Vision

Ranting chant acts as an autonomous operational layer between tenants, property managers, property owners, and third-party providers.

The system intelligently gathers information, coordinates stakeholders, automates repetitive operational workflows, and escalates issues only when necessary.