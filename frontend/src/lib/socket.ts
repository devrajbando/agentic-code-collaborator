import { io, Socket } from "socket.io-client";

// Singleton connection. Previously `createSocket()` opened a brand-new
// connection on every call — fine when only one Yjs room ever existed per
// page, but the project view now joins/leaves a different room per open
// file (one Y.Doc per file, see useYjsBinding.ts), so we need exactly one
// underlying socket shared across those room switches instead of a new
// TCP/WS handshake per file.
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io("http://localhost:4000", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

// Kept for any existing call sites; now just returns the shared singleton
// instead of opening a second connection.
export function createSocket(): Socket {
  return getSocket();
}