import { Redis } from "ioredis";
import { Server as SocketServer } from "socket.io";

export function initAgentSubscriber(io: SocketServer) {
  // Redis subscriber client
  const subscriber = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  subscriber.subscribe("rcc:agent-results", (err, count) => {
    if (err) {
      console.error("Failed to subscribe to agent results channel:", err);
    } else {
      console.log(`Subscribed to agent-results channel (active subscriptions: ${count})`);
    }
  });

  subscriber.on("message", (channel, message) => {
    if (channel === "rcc:agent-results") {
      try {
        const { sessionId,jobId, result } = JSON.parse(message);
        
        // sessionId maps directly to our project/room ID
        // Emit the result to all connected clients in this project room
        io.to(sessionId).emit("agent-result", { jobId, ...result });
        console.log(`Broadcasted agent result to project room: ${sessionId} (job ${jobId})`);
      } catch (parseError) {
        console.error("Failed to parse agent result message:", parseError);
      }
    }
  });
}