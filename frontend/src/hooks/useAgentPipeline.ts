import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../services/socket";
import type { AgentResultPayload, PipelineStatus } from "../types/agent";

export type PipelineJob = {
  id: string | null; // null until the ack arrives
  prompt: string;
  startedAt: number;
  finishedAt: number | null;
  status: "queued" | "processing" | PipelineStatus | "transport_error";
  result: AgentResultPayload | null;
  error: string | null;
};

const HISTORY_LIMIT = 5;

export function useAgentPipeline(projectId: string) {
  const [currentJob, setCurrentJob] = useState<PipelineJob | null>(null);
  const [history, setHistory] = useState<PipelineJob[]>([]);

  useEffect(() => {
    if (!projectId) return;

    // `join-session` is a distinct room from `join-project` (tree/commits)
    // and `join-document` (per-file Yjs) — this is the one result-push
    // actually emits into.
    socket.emit("join-project", projectId);

    const handleAck = ({ jobId }: { jobId: string }) => {
      setCurrentJob((prev) => (prev ? { ...prev, id: jobId, status: "processing" } : prev));
    };

    const handleError = ({ message }: { message: string }) => {
      setCurrentJob((prev) =>
        prev ? { ...prev, status: "transport_error", error: message, finishedAt: Date.now() } : prev
      );
    };

    const handleResult = (payload: AgentResultPayload) => {
      console.log("[useAgentPipeline] received agent-result:", payload);
      setCurrentJob((prev) => {
        console.log("[useAgentPipeline] prev.id:", prev?.id, "payload.jobId:", payload.jobId);
        if (!prev) return prev;
        if (prev.id && payload.jobId !== prev.id) return prev;
         return { ...prev, status: payload.status, result: payload, finishedAt: Date.now() };
      });
    };


    socket.on("chat-command-ack", handleAck);
    socket.on("chat-command-error", handleError);
    socket.on("agent-result", handleResult);

    return () => {
      socket.off("chat-command-ack", handleAck);
      socket.off("chat-command-error", handleError);
      socket.off("agent-result", handleResult);
      socket.emit("leave-project", projectId);
    };
  }, [projectId]);
useEffect(() => {
  if (!currentJob?.finishedAt || !currentJob.id) return;
  setHistory((h) => (h.some((j) => j.id === currentJob.id) ? h : [currentJob, ...h].slice(0, HISTORY_LIMIT)));
}, [currentJob?.finishedAt, currentJob?.id]);
  const isBusy = currentJob?.status === "queued" || currentJob?.status === "processing";
  const isBusyRef = useRef(isBusy);
  isBusyRef.current = isBusy;

  const sendCommand = useCallback(
    (message: string, currentFileContent: string) => {
      if (isBusyRef.current || !message.trim()) return;
      setCurrentJob({
        id: null,
        prompt: message,
        startedAt: Date.now(),
        finishedAt: null,
        status: "queued",
        result: null,
        error: null,
      });
      socket.emit("chat-command", { docId: projectId, message, currentFileContent });
    },
    [projectId]
  );

  const dismissCurrent = useCallback(() => setCurrentJob(null), []);

  return { currentJob, history, sendCommand, dismissCurrent, isBusy };
}