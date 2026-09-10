import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import * as Y from "yjs";
import { getYDoc } from "./yjsRooms.js";
import { enqueueAgentJob } from "../queue/agentQueue.js";
export function initSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "http://localhost:5173", credentials: true },
  });

  io.on("connection", (socket: Socket) => {
    socket.on("join-document", (docId: string) => {
      socket.join(docId);
      socket.data.docId = docId;

      const yDoc = getYDoc(docId);
      const state = Y.encodeStateAsUpdate(yDoc);
      socket.emit("sync-step", state);
    });

    socket.on("yjs-update", ({ docId, update }: { docId: string; update: number[] }) => {
      const yDoc = getYDoc(docId);
      const updateArray = new Uint8Array(update);
      Y.applyUpdate(yDoc, updateArray);

      // Broadcast to everyone else in the room
      socket.to(docId).emit("yjs-update", update);
    });
    socket.on("chat-command", async ({ docId, message, currentFileContent }: { docId: string; message: string; currentFileContent: string }) => {
  try {
    const job = await enqueueAgentJob({
      sessionId: docId,
      userEvent: message,
      currentFileContent,
    });
    socket.emit("chat-command-ack", { jobId: job.id });
  } catch (err) {
    socket.emit("chat-command-error", {
      message: err instanceof Error ? err.message : "Failed to enqueue agent job",
    });
  }
}); 
    socket.on("disconnect", () => {
      // room cleanup handled implicitly by socket.io
    });
  });

  return io;
}