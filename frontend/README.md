# Ranting Chant — Frontend

AI-powered property operations platform. This frontend is fully wired to the FastAPI backend with real API integration for tenants, managers, requests, conversations, and voice services.

The visual language is **Frutiger Aero** — glassmorphism, glossy buttons, sky-blue glows on a deep-navy radial-gradient background.

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Framework | **React 19 + TypeScript** |
| Build / dev server | **Vite 7** |
| Routing | **TanStack Router** (file-based, `src/routes/`) |
| Data fetching | **Axios** with typed API service |
| Styling | **Tailwind CSS v4** via `src/styles.css` (`@theme inline`) |
| Components | **shadcn/ui** (Radix primitives in `src/components/ui/`) |
| Icons | **lucide-react** |
| Toast notifications | **Sonner** |
| Package manager | **bun** |

There is no React Router DOM. Use `Link` / `useNavigate` from `@tanstack/react-router`.

---

## 2. Quick Start

### Prerequisites

- Node.js 18+ or bun
- Backend API running on `http://localhost:8000` (or configured via `VITE_API_URL`)

### Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   bun install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your backend API URL
   VITE_API_URL=http://localhost:8000
   ```

3. **Run the development server**:
   ```bash
   bun run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:5173 (or whichever port Vite picks)
   - Backend API: http://localhost:8000
   - API docs: http://localhost:8000/docs

---

## 3. What's in place

### 3.1 Design system — `src/styles.css`

Custom Frutiger Aero tokens layered on top of shadcn's semantic tokens:

```
--ranting-navy   #0a1628   page background
--ranting-deep   #1a3a5c   secondary surface
--ranting-accent #2d6a9f   primary action
--ranting-sky    #7ec8e3   highlights / glows
--ranting-ice    #c8e6f5   primary text
--ranting-muted  #8a9bb0   secondary text
```

Reusable utility classes (all in `@layer utilities`):

| Class | Purpose |
|---|---|
| `.aero-bg` | Radial-gradient page background |
| `.glass-panel` / `.glass-panel-strong` | Glassmorphic cards / modals |
| `.glossy-btn` / `.glossy-btn-green` / `.glossy-btn-ghost` | Glossy button variants |
| `.aero-input` | Themed input/textarea |
| `.glow-{status}` | Status pill glow (`pending`, `in_progress`, `escalated`, `resolved`, `pending_approval`, `pending_review`) |
| `.urg-{level}` | Urgency pill (`low`, `medium`, `high`) |
| `.left-glow-escalated` / `.left-glow-high` | Table-row left border glow |
| `.mic-pulse` | Red pulsing recording state |
| `.typing-dot` | Animated 3-dot typing indicator |
| `.shimmer` | Loading shimmer placeholder |
| `.underline-glow` | Sky-blue glow underline for headings |
| `.text-glow-sky` | Glowing brand text |

Themed scrollbars (Webkit + Firefox + Radix `ScrollArea`) are applied globally.

### 3.2 API Service — `src/services/api.ts`

Typed Axios-based API service with:
- All backend endpoints (tenants, properties, vendors, managers, requests, conversation, voice, MCP)
- Request/response interceptors for auth and error handling
- Toast notifications on 4xx/5xx errors via Sonner
- Environment-based API URL configuration

### 3.3 Shared components — `src/components/`

- `AeroBackground.tsx` — fixed radial gradient + bokeh blobs (mounted in `__root.tsx`)
- `Logo.tsx` — "Ranting Chant" wordmark with sky-blue glow
- `Avatar.tsx` — initials circle with glowing ring
- `Badges.tsx` — `StatusBadge` and `UrgencyBadge`
- `MessageBubble.tsx` — Tenant/AI message bubbles with timestamps
- `ChatInput.tsx` — Text input with send button and voice toggle
- `RequestCard.tsx` — Request summary card with status/urgency badges
- `RequestTimeline.tsx` — Vertical timeline for conversation history
- `RequestTable.tsx` — Sortable table for management dashboard
- `RequestDetailPanel.tsx` — Slide-in detail panel with AI summary
- `ui/*` — full shadcn/ui library (button, card, sheet, tabs, select, dialog, scroll-area, table, skeleton, sonner, etc.)

### 3.4 Context — `src/context/AppContext.tsx`

Global application state:
- `currentTenant` — Logged-in tenant
- `currentManager` — Logged-in manager
- `userRole` — 'tenant' or 'manager'
- localStorage persistence

### 3.5 Routes — `src/routes/`

| File | URL | Purpose |
|---|---|---|
| `__root.tsx` | — | HTML shell, Inter font, `<AeroBackground />`, `<Outlet />`, `<AppProvider />` |
| `index.tsx` | `/` | Login (shadcn `Tabs` for Tenant vs Manager) |
| `chat.tsx` | `/chat` | Tenant ⇄ AI conversation, mic + send, typing indicator, voice mode |
| `dashboard.tsx` | `/dashboard` | Tenant's request list with expandable timeline |
| `management.tsx` | `/management` | Manager dashboard: stats, filters, sortable table, slide-in detail panel |

The Vite plugin regenerates `src/routeTree.gen.ts` automatically — never edit it manually.

### 3.6 Hooks — `src/hooks/`

- `useVoiceRecorder.ts` — Custom hook wrapping MediaRecorder API for audio recording

---

## 4. Project layout

```
src/
├── routes/              file-based routes (TanStack Router)
│   ├── __root.tsx
│   ├── index.tsx        /        Login
│   ├── chat.tsx         /chat
│   ├── dashboard.tsx    /dashboard
│   └── management.tsx   /management
├── components/
│   ├── AeroBackground.tsx
│   ├── Avatar.tsx
│   ├── Badges.tsx
│   ├── Logo.tsx
│   ├── MessageBubble.tsx
│   ├── ChatInput.tsx
│   ├── RequestCard.tsx
│   ├── RequestTimeline.tsx
│   ├── RequestTable.tsx
│   ├── RequestDetailPanel.tsx
│   └── ui/              shadcn/ui primitives
├── context/
│   └── AppContext.tsx   Global app state
├── hooks/
│   └── useVoiceRecorder.ts
├── services/
│   └── api.ts           Axios API service
├── types/
│   └── index.ts         TypeScript interfaces
├── lib/
│   └── utils.ts         cn() helper
└── styles.css           Tailwind v4 + design tokens + utilities
```

---

## 5. Environment Variables

Create a `.env` file in the frontend root:

```bash
VITE_API_URL=http://localhost:8000
```

For production deployment, set `VITE_API_URL` to your backend URL (e.g., Render backend URL).

---

## 6. Features

### 6.1 Login Page (`/`)
- Two-tab layout: Tenant / Manager
- Tenant login: name + unit → matches against backend via `GET /tenants`
- Manager login: name → matches against backend via `GET /managers`
- Inline error handling for failed authentication
- Stores user in AppContext with localStorage persistence

### 6.2 Chat Page (`/chat`)
- AI-powered conversation interface
- Text input with send button
- Voice mode with microphone toggle (uses MediaRecorder API)
- Real-time typing indicator
- Status badge and urgency display
- Escalation banner for urgent requests
- Loading skeleton during conversation start
- Wired to:
  - `POST /conversation/start` — initialize conversation
  - `POST /conversation/message` — send messages
  - `POST /voice/transcribe` — speech-to-text
  - `POST /voice/respond` — AI voice response

### 6.3 Tenant Dashboard (`/dashboard`)
- Request list filtered by current tenant
- Expandable request cards with timeline
- Status and urgency badges
- "New Request" button navigates to chat
- Loading skeletons during data fetch
- Wired to `GET /requests` filtered by tenant_id

### 6.4 Management Dashboard (`/management`)
- Stats bar: total, escalated, pending approval, resolved
- Filter bar: status, urgency, property
- Sortable table (click headers to sort)
- Escalated rows highlighted red
- Slide-in detail panel with:
  - Full request details
  - Conversation timeline
  - Notification history
  - AI summary (fetched from `GET /requests/{id}/summary`)
- Approve button for pending_approval requests
- Loading skeletons during data fetch
- Wired to:
  - `GET /requests` (filtered client-side by manager ID)
  - `PATCH /requests/{id}` — approve requests
  - `GET /requests/{id}/summary` — AI summary

---

## 7. Build for Production

```bash
bun run build
```

This creates an optimized production build in the `dist/` directory.

---

## 8. Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set root directory to `frontend`
3. Set build command to `bun run build`
4. Set output directory to `dist`
5. Add environment variable: `VITE_API_URL=https://your-backend-url.onrender.com`
6. Deploy

### Other Platforms

The frontend is a standard Vite build and can be deployed to:
- Netlify
- AWS S3 + CloudFront
- GitHub Pages
- Any static hosting service

---

## 9. Conventions

- **Always use design tokens.** Never hard-code colors like `text-white`; use `text-ranting-ice`, `bg-ranting-navy`, etc.
- **Mobile**: tablet (768px+) and desktop are first-class. Mobile <768px is intentionally not optimized.
- **Routing**: add a new page by dropping a file in `src/routes/`. Use dots, not nested directories (`settings.profile.tsx` → `/settings/profile`).
- **API calls**: Use the typed functions from `src/services/api.ts`, not direct Axios calls.
- **Error handling**: API errors automatically show toast notifications via the response interceptor.

---

## 10. Requirements

- Node.js 18+ or bun
- Backend API running on configured URL
- API Keys for backend services (configured in backend)