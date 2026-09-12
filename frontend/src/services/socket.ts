import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "../lib/apiConfig";

declare global {
  // eslint-disable-next-line no-var
  var __synqSocket: Socket | undefined;
}

function createConnection(): Socket {
  return io(API_BASE_URL, {
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

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    globalThis.__synqSocket?.disconnect();
    globalThis.__synqSocket = undefined;
  });
}