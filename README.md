# NexusChat

> Modern random 1-to-1 video chat platform — connect with strangers through live video, audio, and text.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Node.js, Express, TypeScript, Socket.IO |
| Real-time | WebRTC (peer-to-peer), Socket.IO (signaling) |
| Data | Redis (queue/sessions), PostgreSQL (persistence) |
| Infrastructure | Docker, Coturn (TURN server) |

## Project Structure

```
project/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   │   └── api/
│   │   ├── utils/
│   │   ├── assets/
│   │   └── styles/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── validators/
│   │   ├── config/
│   │   ├── utils/
│   │   └── server.ts
│   └── package.json
│
├── .env.example
├── .gitignore
└── README.md
```

## Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd project

# 2. Copy environment variables
cp .env.example .env

# 3. Install all dependencies (from root)
npm install

# 4. Start both frontend and backend
npm run dev
```

### Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Health Check | http://localhost:3001/health |

## Development Commands

```bash
# Start everything (frontend + backend)
npm run dev

# Start only frontend
npm run dev:frontend

# Start only backend
npm run dev:backend

# Build everything
npm run build

# Lint everything
npm run lint
```

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

> ⚠️ **Never commit `.env` to version control.** Only `.env.example` with placeholder values.

## Architecture

```
User A ──── Socket.IO ──── Backend ──── Socket.IO ──── User B
  │                          │                           │
  │         ┌────────────────┤                           │
  │         │  Redis         │  PostgreSQL               │
  │         │  (Queue)       │  (Reports/Bans)           │
  │         └────────────────┘                           │
  │                                                      │
  └──────────────── WebRTC (P2P Video) ─────────────────┘
```

## Milestones

- [x] **M1**: Architecture + Project Setup
- [ ] **M2**: Frontend Foundation
- [ ] **M3**: Backend Foundation
- [ ] **M4**: WebSocket Signaling
- [ ] **M5**: Basic Matchmaking
- [ ] **M6**: WebRTC Video/Audio
- [ ] **M7**: Next/Stop/Disconnect Lifecycle
- [ ] **M8**: Text Chat
- [ ] **M9**: Redis Integration
- [ ] **M10**: PostgreSQL
- [ ] **M11**: Security
- [ ] **M12**: Moderation
- [ ] **M13**: Admin Dashboard
- [ ] **M14**: Testing
- [ ] **M15**: Docker
- [ ] **M16**: Cloud Deployment
- [ ] **M17**: Production Hardening

## License

Private — All rights reserved.
