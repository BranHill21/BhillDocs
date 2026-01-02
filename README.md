# Ephemeral Docs

**The Open-Source, Real-Time Collaboration Suite that Forgets.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)

Ephemeral Docs is a **high-performance, real-time collaborative rich text editor** designed for speed, privacy, and simplicity. It allows multiple users to edit documents simultaneously with sub-millisecond sync latency.

The twist? **It has no database.**

All data exists purely in the server's volatile memory. Once a document is abandoned (everyone leaves for >1 hour), it vanishes forever. Perfect for quick brainstorms, private notes, or temporary code sharing.

---

## Key Features

### Real-Time Collaboration
*   **Instant Sync**: Powered by **Yjs** CRDTs and **WebSockets**, changes appear instantly on all connected devices.
*   **Live Presence**: See who's online with **pulsing user indicators** and **collaborative cursors** that show exactly where others are typing.
*   **Conflict-Free**: Type over each other without fear. The mathematical magic of CRDTs ensures everyone always sees the same final state.

### Powerful Rich Text Editor
Built on top of the robust **Tiptap** headless editor, providing a premium writing experience:
*   **Typography**: Custom fonts (Inter, Serif, Mono) and adjustable sizes.
*   **Formatting**: **Bold**, *Italic*, <u>Underline</u>, <del>Strike</del>, <mark>Highlight</mark>, and Blockquotes.
*   **Structure**: Headings (H1/H2), Bullet Lists, Numbered Lists, and interactive **Task Lists**.
*   **Layout**: Precision alignment (Left, Center, Right).
*   **Media**: Insert hyperlinks with ease.

### Privacy & Ephemerality
*   **Zero Trace**: No database. No logs. Data resides in RAM and is garbage collected automatically.
*   **Private Rooms**: Create password-protected documents for sensitive collaboration.
*   **Public Lobby**: Discover active public sessions in the real-time lobby.

### Export Anywhere
Take your data with you before it disappears:
*   **PDF**: High-fidelity PDF export preserving all formatting.
*   **HTML**: Raw HTML for web use.
*   **TXT**: Plain text for notes.
*   **JSON**: Full document structure for programmatic use.

---

## Tech Stack

This project leverages a modern, performance-oriented stack:

### **Frontend (Client)**
*   **Framework**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/) for lightning-fast builds.
*   **Language**: TypeScript for type-safe robustness.
*   **Rich Text Engine**: [Tiptap](https://tiptap.dev/) (ProseMirror wrapper) for the editor core.
*   **Collaboration**: `yjs` + `y-websocket` + `@tiptap/extension-collaboration`.
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) for a sleek, responsive UI.
*   **PDF Generation**: `html2pdf.js` for client-side rendering.
*   **Routing**: `react-router-dom` v7.

### **Backend (Server)**
*   **Runtime**: Node.js.
*   **Server**: Express with a dedicated `WebSocketServer`.
*   **State Management**: In-memory `Map` registry tracking `Y.Doc` sessions.
*   **Protocol**: Binary-optimized WebSocket messages using `lib0` encoding/decoding for maximum efficiency.
*   **Security**: `bcrypt` for secure password hashing of private rooms.

---

## Getting Started

### 1. Installation
Clone the repo and install dependencies for both client and server:

```bash
# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 2. Running Locally
You need two terminal windows running simultaneously.

**Terminal 1 (Server):**
```bash
cd server
npm run dev
# Server starts on http://localhost:3000
```

**Terminal 2 (Client):**
```bash
cd client
npm run dev
# Client starts on http://localhost:5173
```

### 3. Usage
Open **http://localhost:5173** in your browser.
*   **Create**: Click "New Public Document" to start instantly.
*   **Share**: Copy the URL to a friend to collaborate.
*   **Private**: Choose "New Private Document" to lock it with a password.

---

## Architecture

### server/src/documentRegistry.ts
The brain of the operation. It manages the `docs` Map, which stores `DocumentSession` objects. Each session holds the live `Y.Doc` instance, metadata (title, user count), and the password hash.

### server/src/index.ts
Handles the WebSocket upgrades. It parses incoming binary messages using `lib0/decoding` to distinguish between sync steps, awareness updates, and authentication challenges.

### server/src/cleanup.ts
The janitor. A `setInterval` loop wakes up every few seconds to check `doc.lastAccessed`. If `(now - lastAccessed) > 1 hour`, the document is nuked from memory to free up RAM.

---
