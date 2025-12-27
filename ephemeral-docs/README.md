# Ephemeral Docs

A lightweight, ephemeral, real-time collaborative rich text editor.

## Features

- **Real-Time Collaboration**: Powered by Yjs and WebSockets.
- **Ephemeral Storage**: No database. Documents live in memory and vanish after 1 hour of inactivity.
- **Privacy**: Option to create password-protected private documents.
- **Rich Text**: Built with TipTap. Supports formatting and export.
- **Discoverability**: Public documents are listed on the home page with live user counts.

## Architecture

### System Design
- **Client**: React SPA. Uses `y-websocket` to connect to the server. The `TipTap` editor binds to the local `Y.Doc`, which syncs over the wire.
- **Server**: Node.js/Express. Maintains an in-memory `Map` of document sessions.
    - **Registry**: Tracks active documents, passwords, and connected sockets.
    - **Broadcasting**: Listens to Yjs updates from any client and broadcasts them to all other connected clients for that document.
    - **Cleanup**: A background interval checks usage and garbage collects stale documents.

### Tech Stack
- **Frontend**: React, specific implementation of TipTap with Yjs, Tailwind CSS, Vite.
- **Backend**: Node.js, Express, `ws` (WebSocket), `yjs`.

## Getting Started

### Prerequisites
- Node.js (v18+)

### Installation

1.  **Server Setup**
    ```bash
    cd server
    npm install
    ```

2.  **Client Setup**
    ```bash
    cd client
    npm install
    ```

### Running Locally

1.  Start the backend (runs on port 3000):
    ```bash
    cd server
    npm run dev
    ```

2.  Start the frontend (runs on port 5173):
    ```bash
    cd client
    npm run dev
    ```

3.  Open [http://localhost:5173](http://localhost:5173) in your browser.

## Design Trade-offs
- **In-Memory**: extremely fast, but data is lost on server crash/restart.
- **No Auth**: Simple user experience, but no persistent identity.
- **Real-time**: Heavy WebSocket usage; scaling beyond a single instance would require Redis/PubSub (not implemented here per requirements).
