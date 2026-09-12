// frontend/src/components/project/__tests__/AgentDock.test.tsx
import { cleanup, render, screen,fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it,vi } from "vitest";
import { AgentDock } from "../AgentDock";

afterEach(() => {
  cleanup();
});
describe("AgentDock", () => {
  it("shows the idle placeholder when there is no job", () => {
    render(<AgentDock job={null} history={[]} isBusy={false} onSend={vi.fn()} onDismiss={vi.fn()} onDraftDecision={vi.fn()} />);
    expect(screen.getByText(/ask the agent/i)).toBeInTheDocument();
  });

  it("disables the input and send button while busy", () => {
    render(
      <AgentDock
        job={{ id: "1", prompt: "x", startedAt: Date.now(), finishedAt: null, status: "processing", result: null, error: null }}
        history={[]} isBusy onSend={vi.fn()} onDismiss={vi.fn()} onDraftDecision={vi.fn()}
      />
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: /working/i })).toBeDisabled();
  });

  it("requires a description before allowing accept on a snippet_gen draft", () => {
    const onDraftDecision = vi.fn();
    const job = {
      id: "1", prompt: "x", startedAt: Date.now(), finishedAt: Date.now(), error: null,
      status: "success" as const,
      result: {
        jobId: "1", 
        sessionId: "p1", status: "success" as const, routerOutput: null, criticVerdicts: [],
        executorResult: null, failureTriage: null, attemptNumber: 1,
        drafts: [{ agentType: "snippet_gen" as const, content: "const x=1;", toolsUsed: [], attemptNumber: 1 }],
      },
    };
    render(<AgentDock job={job} history={[]} isBusy={false} onSend={vi.fn()} onDismiss={vi.fn()} onDraftDecision={onDraftDecision} />);

    fireEvent.click(screen.getByRole("button", { name: /accept/i }));
    expect(onDraftDecision).not.toHaveBeenCalled(); // first click just reveals the field

    fireEvent.click(screen.getByRole("button", { name: /save & accept/i }));
    expect(onDraftDecision).not.toHaveBeenCalled(); // still blocked, description empty

    fireEvent.change(screen.getByLabelText(/describe this snippet/i), { target: { value: "cors setup" } });
    fireEvent.click(screen.getByRole("button", { name: /save & accept/i }));
    expect(onDraftDecision).toHaveBeenCalledWith(expect.anything(), true, "cors setup");
  });
});