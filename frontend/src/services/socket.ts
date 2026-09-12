import { io, Socket } from "socket.io-client";

declare global {
  // eslint-disable-next-line no-var
  var __synqSocket: Socket | undefined;
}

function createConnection(): Socket {
  return io("http://localhost:4000", {
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
}

export function getSocket(): Socket {
  if (!globalThis.__synqSocket) {
    globalThis.__synqSocket = createConnection();
  }
  return globalThis.__synqSocket;
}

export const socket = getSocket();

export function createSocket(): Socket {
  return getSocket();
}

// Vite HMR: dispose the connection on real teardown (full page reload / module removal),
// not on every hot-swap — this is what actually breaks the accumulation.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    globalThis.__synqSocket?.disconnect();
    globalThis.__synqSocket = undefined;
  });
}