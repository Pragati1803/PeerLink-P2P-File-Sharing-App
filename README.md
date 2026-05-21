# PeerLink – P2P File Sharing App

A full-stack peer-to-peer file sharing application with no cloud storage — files transfer directly between browsers via a signaling server.

```
┌─────────────┐     invite code      ┌─────────────┐
│   Sender    │ ──────────────────── │  Receiver   │
│  (Browser)  │ ◄── WebSocket P2P ──► │  (Browser)  │
└─────────────┘                      └─────────────┘
       │                                    │
       └──────────── Nginx :80 ─────────────┘
                         │
              ┌──────────┴──────────┐
              │  Spring Boot :8080  │  ◄── REST + WebSocket
              │  Next.js :3000      │  ◄── React UI
              └─────────────────────┘
```

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Backend    | Java 17, Spring Boot 3, WebSockets  |
| Frontend   | Next.js 14, TypeScript, Tailwind    |
| Proxy      | Nginx 1.25 (reverse proxy)          |
| Container  | Docker + Docker Compose             |

## Quick Start

### Prerequisites
- Docker ≥ 24
- Docker Compose ≥ 2.20

### Run (one command)

```bash
docker compose up --build
```

Open **http://localhost** in two browser tabs.

---

## How It Works

1. **Sender** drops a file → backend generates a 6-character invite code
2. **Sender** shares the code with the receiver (out of band)
3. **Receiver** enters the code → both peers connect via WebSocket
4. File chunks stream through the WebSocket relay server
5. **Receiver** downloads the assembled file — nothing stored on server

## Project Structure

```
peerlink/
├── backend/                   # Java Spring Boot
│   ├── src/main/java/com/peerlink/
│   │   ├── PeerLinkApplication.java
│   │   ├── config/
│   │   │   ├── SecurityConfig.java
│   │   │   └── WebSocketConfig.java
│   │   ├── controller/
│   │   │   ├── HealthController.java
│   │   │   └── SessionController.java
│   │   ├── model/
│   │   │   ├── FileInfo.java
│   │   │   ├── TransferSession.java
│   │   │   └── WebSocketMessage.java
│   │   ├── service/
│   │   │   └── SessionService.java
│   │   └── websocket/
│   │       └── FileTransferWebSocketHandler.java
│   ├── Dockerfile
│   └── pom.xml
│
├── frontend/                  # Next.js 14
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── DropZone.tsx
│   │   │   ├── InviteCode.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── SenderPanel.tsx
│   │   │   └── ReceiverPanel.tsx
│   │   ├── hooks/
│   │   │   ├── useSender.ts
│   │   │   ├── useReceiver.ts
│   │   │   └── useWebSocket.ts
│   │   └── lib/
│   │       └── utils.ts
│   ├── Dockerfile
│   └── package.json
│
├── nginx/
│   └── nginx.conf             # Reverse proxy config
│
└── docker-compose.yml
```

## REST API

| Method | Path                        | Description                   |
|--------|-----------------------------|-------------------------------|
| GET    | `/api/health`               | Health check                  |
| GET    | `/api/sessions/validate/:code` | Validate invite code       |
| GET    | `/api/sessions/:code/status`   | Get transfer status        |
| GET    | `/api/sessions/stats`       | Active session stats          |

## WebSocket Events (`ws://host/ws/transfer`)

| Message Type       | Direction       | Description                    |
|--------------------|-----------------|--------------------------------|
| `SESSION_CREATED`  | Client→Server   | Create new session             |
| `SESSION_CREATED`  | Server→Client   | Returns invite code            |
| `RECEIVER_JOINED`  | Client→Server   | Join by invite code            |
| `TRANSFER_READY`   | Server→Sender   | Receiver connected             |
| `FILE_INFO`        | Sender→Server→Receiver | File metadata          |
| `FILE_INFO_ACK`    | Receiver→Server→Sender | Ready to receive       |
| `FILE_CHUNK`       | Sender→Server→Receiver | Chunk metadata         |
| `CHUNK_ACK`        | Receiver→Server→Sender | Chunk received         |
| `TRANSFER_COMPLETE`| Either→Both     | Transfer done                  |
| `CANCEL`           | Either→Both     | Cancel transfer                |
| `ERROR`            | Server→Client   | Error notification             |

## Development (without Docker)

### Backend
```bash
cd backend
mvn spring-boot:run
# Runs on http://localhost:8080
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

## Environment Variables

| Variable               | Default                      | Description           |
|------------------------|------------------------------|-----------------------|
| `NEXT_PUBLIC_API_URL`  | `http://localhost:8080`      | Backend API URL       |
| `NEXT_PUBLIC_WS_URL`   | `ws://localhost:8080`        | WebSocket URL         |
| `SERVER_PORT`          | `8080`                       | Backend port          |

## Session Lifecycle

```
WAITING → CONNECTED → TRANSFERRING → COMPLETED
                  ↘ FAILED (disconnect)
                  ↘ EXPIRED (30min TTL)
```

Sessions auto-expire after 30 minutes. The backend cleans expired sessions every 5 minutes.
