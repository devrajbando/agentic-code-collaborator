import { io, Socket } from "socket.io-client";

export function createSocket(): Socket {
  return io("http://localhost:4000");
}