// agents/src/tools/jdoodleClient.ts

export interface JDoodleExecuteRequest {
  script: string;
  language: string; // e.g. "typescript", "nodejs"
  versionIndex: string; // JDoodle's version selector, per language
  stdin?: string;
}

interface JDoodleExecuteResponse {
  output: string;
  error?: string | null;
  statusCode: number;
  memory?: string;
  cpuTime?: string;
  isExecutionSuccess?: boolean;
  isCompiled?: boolean;
}

const JDOODLE_BASE_URL = "https://api.jdoodle.com/v1/execute";
const JDOODLE_CLIENT_ID = process.env.JDOODLE_CLIENT_ID;
const JDOODLE_CLIENT_SECRET = process.env.JDOODLE_CLIENT_SECRET;

export async function jdoodleExecute(req: JDoodleExecuteRequest): Promise<JDoodleExecuteResponse> {
  if (!JDOODLE_CLIENT_ID || !JDOODLE_CLIENT_SECRET) {
    throw new Error("JDoodle execute failed: JDOODLE_CLIENT_ID/JDOODLE_CLIENT_SECRET not configured");
  }

  const res = await fetch(JDOODLE_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: JDOODLE_CLIENT_ID,
      clientSecret: JDOODLE_CLIENT_SECRET,
      script: req.script,
      language: req.language,
      versionIndex: req.versionIndex,
      stdin: req.stdin ?? "",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`JDoodle execute failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as JDoodleExecuteResponse;

  // JDoodle signals rate-limit/daily-quota exhaustion via statusCode inside a 200 response,
  // not an HTTP error status — treat that the same way pistonClient.ts treats a bad HTTP status.
  if (json.statusCode === 429 || json.statusCode === 400) {
    throw new Error(`JDoodle execute failed (statusCode ${json.statusCode}): ${json.error ?? "unknown error"}`);
  }

  return json;
}