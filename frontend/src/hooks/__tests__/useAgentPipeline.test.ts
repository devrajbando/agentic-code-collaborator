// frontend/src/hooks/__tests__/useAgentPipeline.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAgentPipeline } from "../useAgentPipeline";
import { socket } from "../../services/socket";

vi.mock("../../services/socket");

describe("useAgentPipeline", () => {
  beforeEach(() => vi.clearAllMocks());

  it("joins the project room and sets a queued job on send", () => {
    const { result } = renderHook(() => useAgentPipeline("proj-1"));
    expect(socket.emit).toHaveBeenCalledWith("join-project", "proj-1");

    act(() => result.current.sendCommand("do a thing", "file content"));
    expect(result.current.currentJob?.status).toBe("queued");
    expect(socket.emit).toHaveBeenCalledWith("chat-command", {
      docId: "proj-1", message: "do a thing", currentFileContent: "file content",
    });
  });

  it("ignores a send while already busy (single-in-flight guard)", () => {
    const { result } = renderHook(() => useAgentPipeline("proj-1"));
    act(() => result.current.sendCommand("first", "content"));
    const emitCallsAfterFirst = (socket.emit as any).mock.calls.length;

    act(() => result.current.sendCommand("second", "content"));
    expect((socket.emit as any).mock.calls.length).toBe(emitCallsAfterFirst); // no new emit
  });

  it("only applies a result matching the current job's id (regression: multi-client misattribution)", () => {
    const { result } = renderHook(() => useAgentPipeline("proj-1"));
    act(() => result.current.sendCommand("mine", "content"));
    act(() => (socket as any).__trigger("chat-command-ack", { jobId: "my-job-id" }));

    // A result for a DIFFERENT job (e.g. a collaborator's concurrent request)
    // must not overwrite this client's currentJob.
    act(() => (socket as any).__trigger("agent-result", { jobId: "someone-elses-job", status: "success" }));

    expect(result.current.currentJob?.status).toBe("processing"); // unchanged, not "success"
  });

  it("appends exactly one history entry per finished job, even under repeated renders (Strict Mode regression)", async () => {
    const { result, rerender } = renderHook(() => useAgentPipeline("proj-1"));
    act(() => result.current.sendCommand("test", "content"));
    act(() => (socket as any).__trigger("chat-command-ack", { jobId: "job-1" }));
    act(() => (socket as any).__trigger("agent-result", { jobId: "job-1", status: "success" }));
    rerender();

    await waitFor(() => expect(result.current.history).toHaveLength(1));
  });
});