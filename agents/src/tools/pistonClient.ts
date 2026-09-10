export interface PistonExecuteRequest {
  language: string;
  version: string;
  files: { name: string; content: string }[];
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

interface PistonRunResult {
  stdout: string;
  stderr: string;
  code: number | null; // null when killed by a signal (e.g. timeout) rather than exiting normally
  signal: string | null;
  output: string;
}

interface PistonExecuteResponse {
  language: string;
  version: string;
  compile?: PistonRunResult;
  run: PistonRunResult;
}

const PISTON_BASE_URL = process.env.PISTON_URL ?? "http://localhost:2000";

export async function pistonExecute(req: PistonExecuteRequest): Promise<PistonExecuteResponse> {
  const res = await fetch(`${PISTON_BASE_URL}/api/v2/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Piston execute failed (${res.status}): ${body.slice(0, 300)}`);
  }

  return (await res.json()) as PistonExecuteResponse;
}