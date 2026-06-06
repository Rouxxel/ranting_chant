# Ranting Chant Frontend

React 19 + TypeScript frontend for Ranting Chant, an AI-powered property operations platform. The app is wired to the FastAPI backend for tenants, managers, owners, vendors, requests, conversations, and voice services.

The visual language is **retro Frutiger Aero** (circa 2004–2013): bright sky-blue + grass-green photo backdrop, translucent glossy glass panels with strong specular highlights, candy-pill buttons with bright top sheen and saturated bottom edge, and floating bubbles. Think Windows Vista / early-iOS skeuomorphism, 30.3k r/FrutigerAero. Text on glass surfaces is deep navy, not white — preserving the classic light-on-bright aero hierarchy.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build/dev server | Vite 7 |
| Routing | TanStack Router file routes in `src/routes/` |
| Data fetching | Axios through `src/services/api.ts` |
| Styling | Tailwind CSS v4 via `src/styles.css` |
| Components | shadcn/ui Radix primitives in `src/components/ui/` |
| Icons | lucide-react |
| Toasts | Sonner |
| Package manager | bun |

Use `Link`, `useNavigate`, and route APIs from `@tanstack/react-router`. This app does not use React Router DOM.

## Quick Start

```bash
cd frontend
bun install
bun run dev
```

The dev server usually runs at `http://localhost:5173`.

The API service defaults to:

- `VITE_LOCAL_BACKEND` or `http://localhost:8000`
- `VITE_PROD_BACKEND` or `https://ranting-chant.onrender.com`

Create `frontend/.env` when you need custom URLs:

```bash
VITE_LOCAL_BACKEND=http://localhost:8000
VITE_PROD_BACKEND=https://your-production-backend.example.com
```

## What's In Place

### App Shell and Auth State

- `src/routes/__root.tsx` mounts the app shell, `AeroBackground`, `AppProvider`, and route outlet.
- `src/context/AppContext.tsx` stores `currentTenant`, `currentManager`, and `userRole` in localStorage.
- `src/components/AuthenticatedLayout.tsx` provides the shared authenticated header with logo, role-aware navigation, avatar, and logout.
- `src/lib/auth.ts` provides route guards for tenant-only, manager/owner-only, and any-authenticated-user routes.
- Logout is client-side: it clears the current user plus cached request/vendor keys, then navigates to `/`.

Backend authentication is not implemented yet, so protected frontend routes rely on persisted app context.

### Routes

| File | URL | Purpose |
|---|---|---|
| `index.tsx` | `/` | Tenant and manager/owner login |
| `chat.tsx` | `/chat` | Tenant AI conversation with text and voice input |
| `dashboard.tsx` | `/dashboard` | Tenant request list and timelines |
| `profile.tsx` | `/profile` | Tenant profile with editable email/phone and property representative contact |
| `management.tsx` | `/management` | Manager/owner dashboard with tabs for Requests, Properties, Tenants, Vendors, and Profile |
| `vendors.tsx` | `/vendors` | Vendor directory with search and service filtering |

Protected route behavior:

- `/chat`, `/dashboard`, and `/profile` require a tenant session.
- `/management` requires a manager or owner session.
- `/vendors` requires any authenticated session.

The Vite router plugin regenerates `src/routeTree.gen.ts`; do not edit it manually.

### Shared Components

- `AeroBackground.tsx` - fixed page background
- `AuthenticatedLayout.tsx` - authenticated app header, nav, avatar, logout
- `Logo.tsx` - Ranting Chant wordmark
- `Avatar.tsx` - initials avatar
- `Badges.tsx` - status, urgency, and request type badges
- `MessageBubble.tsx` - tenant/AI chat messages with suggested contacts and notification sending
- `ChatInput.tsx` - text input, send button, voice toggle
- `RequestCard.tsx` - tenant request card with cancel button
- `RequestTimeline.tsx` - conversation/notification timeline
- `RequestTable.tsx` - management request table
- `RequestDetailPanel.tsx` - slide-in request details, AI summary, notification history, and resolve/complete buttons
- `TenantProfile.tsx` - tenant profile with editable email/phone
- `PropertyRepresentative.tsx` - property manager/owner contact info for tenants
- `ManagementProperties.tsx` - properties management with create/edit forms
- `ManagementTenants.tsx` - tenant management with create/edit forms
- `ManagementProfile.tsx` - manager/owner profile with editable email/phone
- `ui/*` - shadcn/ui primitives

### API Service

`src/services/api.ts` is the only place route components should call backend HTTP endpoints directly.

It includes typed helpers for:

- tenants, properties, vendors, managers, owners (CRUD operations)
- requests (create, update, cancel, complete, resolve)
- profile updates for tenants, managers, and owners
- conversation start/message/history/save
- conversation send-notifications
- voice transcription/start/respond
- MCP tools

The Axios interceptor:

- adds `auth_token` when present
- retries against the fallback backend URL on network failures
- shows Sonner toasts for connection and request errors
- clears `auth_token` and redirects to `/` on `401`

### Request Types

Canonical request types live in `src/types/index.ts` and mirror `backend/src/models/request.py`.

```ts
export const REQUEST_TYPES = [
  "plumbing",
  "electrical",
  "hvac",
  "appliance",
  "pest_control",
  "lockout",
  "access_control",
  "noise",
  "lease_question",
  "rent_payment",
  "emergency",
  "general",
] as const;
```

Use:

- `RequestType` for request type fields
- `requestTypeLabels` for display labels
- `getRequestTypeLabel(type)` for UI text
- `RequestTypeBadge` for compact category display

Current request type UI support:

- request cards display readable type labels
- request detail panels display type badges
- management table displays type badges
- management filters include all canonical request types
- chat/save metadata sends a canonical type instead of deriving type from status

## Design System — Retro Frutiger Aero

Design tokens and utilities live in `src/styles.css`. The aesthetic is built on three pillars:

1. **Photographic sky/grass backdrop** — `public/aero-wallpaper.jpg` is rendered behind everything by `<AeroBackground />` with a sun halo and floating animated bubbles (`Bubble` sub-component).
2. **Glossy translucent glass** — light-mode glass with `backdrop-filter: blur + saturate`, a 1px white top highlight (`::before` arc), and a soft navy bottom edge. Text on glass defaults to deep navy.
3. **Candy-pill glossy buttons** — fully rounded (`border-radius: 999px`) with a hard top sheen at 48%, transparent gap at 50%, then a saturated brand gradient bottom. White 1px border + dark text-shadow for that early-iOS / Vista button feel.

Core tokens (brightened palette):

```text
--ranting-navy    #0a2a4a   /* deep readable text on glass */
--ranting-deep    #1f5d8f
--ranting-accent  #2d8fd6   /* primary blue */
--ranting-sky     #7ec8e3
--ranting-ice     #e6f4fb
--ranting-muted   #5a7892   /* secondary text on glass */
--ranting-grass   #7ec96d   /* organic accent */
```

Reusable utility classes:

| Class | Purpose |
|---|---|
| `.aero-bg` | Sky-to-grass gradient fallback (background image is preferred) |
| `.glass-panel` / `.glass-panel-strong` | Translucent glossy glass surfaces (with top-highlight arc) |
| `.glossy-btn` / `.glossy-btn-green` / `.glossy-btn-ghost` / `.glossy-btn-ghost-active` | Candy-pill buttons |
| `.aero-input` | Pill-shaped translucent input |
| `.aero-bubble` | Floating bubble (`bubbleFloat` 14s loop) |
| `.glow-{status}` | Status badge glow (pending / in_progress / escalated / resolved / pending_approval / pending_review / cancelled) |
| `.urg-{level}` | Urgency badge colors (low / medium / high) |
| `.left-glow-escalated` / `.left-glow-high` | Table row urgency accents |
| `.mic-pulse` | Recording-state pulsing red ring |
| `.typing-dot` | Chat typing indicator |
| `.shimmer` | Loading placeholders |
| `.underline-glow` | Heading underline |
| `.text-glow-sky` | White headline with sky-blue halo |

### Aesthetic guidelines for new UI

- Wrap every section in `.glass-panel` (or `-strong`). Don't put raw `bg-*` colors over the wallpaper.
- Use `.glossy-btn*` for any primary action. They're pill-shaped on purpose — avoid mixing square buttons.
- Keep body text dark (`text-ranting-navy` or default panel color). Reserve white text for hero headlines + `text-glow-sky`.
- Add `.aero-bubble` divs sparingly for ornament. The background already provides ambient bubbles.
- Status pills should always use `.glow-*` classes for the glowing edge — never plain `bg-*` swatches.


## Project Layout

```text
src/
|-- components/
|   |-- AuthenticatedLayout.tsx
|   |-- AeroBackground.tsx
|   |-- Avatar.tsx
|   |-- Badges.tsx
|   |-- ChatInput.tsx
|   |-- Logo.tsx
|   |-- MessageBubble.tsx
|   |-- RequestCard.tsx
|   |-- RequestDetailPanel.tsx
|   |-- RequestTable.tsx
|   |-- RequestTimeline.tsx
|   |-- TenantProfile.tsx
|   |-- PropertyRepresentative.tsx
|   |-- ManagementProperties.tsx
|   |-- ManagementTenants.tsx
|   |-- ManagementProfile.tsx
|   `-- ui/
|-- context/
|   `-- AppContext.tsx
|-- hooks/
|   `-- useVoiceRecorder.ts
|-- lib/
|   |-- auth.ts
|   `-- utils.ts
|-- routes/
|   |-- __root.tsx
|   |-- index.tsx
|   |-- chat.tsx
|   |-- dashboard.tsx
|   |-- profile.tsx
|   |-- management.tsx
|   `-- vendors.tsx
|-- services/
|   `-- api.ts
|-- types/
|   `-- index.ts
`-- styles.css
```

## Features

### Login (`/`)

- Tenant login: name + unit matched against `GET /tenants`
- Manager/owner login: name matched against `GET /managers` and `GET /owners`
- Stores current user and role in `AppContext`

### Chat (`/chat`)

- Guarded tenant route
- Starts a conversation through `POST /conversation/start`
- Sends messages through `POST /conversation/message`
- Displays AI-suggested contacts with toggles for notification confirmation
- Sends notifications through `POST /conversation/send-notifications` (after conversation is saved)
- Supports voice transcription through `POST /voice/transcribe`
- Supports voice response through `POST /voice/respond`
- Saves conversations through `POST /conversation/save-conversation`
- Invalidates cached tenant requests when new requests are created

### Tenant Dashboard (`/dashboard`)

- Guarded tenant route
- Lists current tenant requests from `GET /requests`
- Caches tenant request lists under `requests_{tenantId}`
- Shows request cards, status/urgency/type information, and expandable timelines
- Allows tenants to cancel pending or in-progress requests with confirmation dialog

### Tenant Profile (`/profile`)

- Guarded tenant route
- Displays tenant's profile information (name, unit, property, email, phone)
- Allows tenants to edit their email and phone
- Shows property representative contact information (manager/owner name, role, email, phone)

### Management Dashboard (`/management`)

- Guarded manager/owner route
- Tabbed interface for Requests, Properties, Tenants, Vendors, and Profile
- Requests tab filters by managed or owned property IDs
- Displays stats for total, escalated, pending approval, and resolved requests
- Filters by request type, status, urgency, and property
- Opens a request detail panel with summary, conversation, and detailed notification history
- Approves pending approval requests with `PATCH /requests/{id}`
- Resolves requests with resolution responses using `POST /requests/{id}/resolve`
- Completes in-progress or escalated requests with resolution note using `POST /requests/{id}/complete`
- Properties tab with create/edit forms and tenant listings
- Tenants tab with create/edit forms and request history
- Vendors tab with role-aware CRUD for managers/owners
- Profile tab with editable email/phone and managed/owned properties

### Vendor Directory (`/vendors`)

- Guarded authenticated route
- Available to tenants, managers, and owners
- Uses cached `vendors` data and refreshes from `GET /vendors`
- Supports text search and service filtering
- Managers/owners can create, edit, and delete vendors
- Tenants have read-only access

## Build

```bash
bun run build
```

The production build is written to `dist/`.

## Conventions

- Use `src/services/api.ts` for backend calls.
- Use TanStack Router file routes in `src/routes/`.
- Use the design tokens and utility classes in `src/styles.css`.
- Use `RequestType`, `REQUEST_TYPES`, and `getRequestTypeLabel()` for request type work.
- Keep route guards aligned with `src/lib/auth.ts`.
- Do not edit `src/routeTree.gen.ts` manually.

## Requirements

- Node.js 18+ or bun
- Backend API running on the configured URL
- Backend service keys configured when AI, voice, email, or SMS features are needed
