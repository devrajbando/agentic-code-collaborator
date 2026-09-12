import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import * as Y from "yjs";
import { getYDoc } from "./yjsRooms.js";
import { enqueueAgentJob } from "../queue/agentQueue.js";

let cachedIo: SocketIOServer | null = null;

export function initSocket(httpServer: HTTPServer) {
  if (cachedIo) {
    return cachedIo; // Prevent multiple socket servers binding to the same http server
  }

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "http://localhost:5173", credentials: true },
    transports: ["websocket", "polling"], // Explicitly define transport fallbacks
  });

  cachedIo = io;

  io.on("connection", (socket: Socket) => {
    // --- PROJECT ROOM & FILE TREE SYNC ---
    socket.on("join-project", (projectId: string) => {
      socket.join(projectId);
    });

    socket.on("leave-project", (projectId: string) => {
      socket.leave(projectId);
    });

    socket.on("file-tree-mutation", ({ projectId, tree }: { projectId: string; tree: any }) => {
      socket.to(projectId).emit("file-tree-updated", tree);
    });
    // -------------------------------------

    socket.on("join-document", (docId: string) => {
      socket.join(docId);
      socket.data.docId = docId;

      const yDoc = getYDoc(docId);
      const state = Y.encodeStateAsUpdate(yDoc);
      socket.emit("sync-step", state);
    });

    socket.on("leave-document", (docId: string) => {
      socket.leave(docId);
    });

    socket.on("yjs-update", ({ docId, update }: { docId: string; update: number[] }) => {
      const yDoc = getYDoc(docId);
      const updateArray = new Uint8Array(update);
      Y.applyUpdate(yDoc, updateArray);

      socket.to(docId).emit("yjs-update", { docId, update });
    });

    socket.on("awareness-update", ({ docId, update }: { docId: string; update: number[] }) => {
      socket.to(docId).emit("awareness-update", { docId, update });
    });

    socket.on("chat-command", async ({ docId, message, currentFileContent }) => {
      try {
        console.log("Received chat-command from client:", message); // <-- Add this
        const job = await enqueueAgentJob({
          sessionId: docId,
          userEvent: message,
          currentFileContent,
        });
        socket.emit("chat-command-ack", { jobId: job.id });
      } catch (err) {
        console.error("Failed to enqueue agent job:", err); // <-- Ensure this prints
        socket.emit("chat-command-error", {
          message: err instanceof Error ? err.message : "Failed to enqueue agent job",
        });
      }
    });

    socket.on("commit-mutation", ({ projectId, commits }: { projectId: string; commits: any[] }) => {
      socket.to(projectId).emit("commits-updated", commits);
    });

    socket.on("disconnect", () => {
      // room cleanup handled implicitly by socket.io
    });
  });

  return io;
}