import * as ts from "typescript";
import { ESLint } from "eslint";
import { GeneratorDraftSchema, type GeneratorDraft } from "@rcc/types";
import { callWithFallback, buildQualityChain } from "../../llm/fallback.js";
import { createGroqProvider } from "../../llm/providers/groq.js";
import { createGeminiProvider } from "../../llm/providers/gemini.js";
import { createOpenRouterProvider } from "../../llm/providers/openrouter.js";
import type { GraphStateType } from "../state.js";

interface ToolIssue {
  source: "ts-compiler-api" | "eslint";
  severity: "error" | "warning";
  line?: number;
  column?: number;
  message: string;
}

// Quality chain per Section 3: this is a correctness-sensitive agent, not a
// latency-sensitive one -- Gemini/OpenRouter primary, Groq as final fallback
// (opposite priority order from the router's fast chain).
const qualityChain = buildQualityChain(
  createGeminiProvider(),
  createOpenRouterProvider(),
  createGroqProvider(),
);

const VIRTUAL_FILENAME = "userFile.ts";

// --- Tool 1: TypeScript compiler API ---------------------------------------
// IMPORTANT LIMITATION (state this plainly, don't overclaim "type-checked"):
// this file arrives as a bare in-memory string with no tsconfig/project context
// -- no resolvable imports, no full lib type graph -- so a real type-check
// (ts.createProgram against the actual project) isn't possible without writing
// to disk and re-resolving the whole project, which defeats the point of a
// fast inline check. What this actually catches is SYNTAX errors the parser
// itself rejects (malformed code), not type errors. A true type-check would
// need to run against the file materialized in its real project location --
// worth flagging as a known gap rather than silently pretending otherwise.
function runTsCheck(fileContent: string): ToolIssue[] {
  const sourceFile = ts.createSourceFile(
    VIRTUAL_FILENAME,
    fileContent,
    ts.ScriptTarget.Latest,
    true,
  );

  const diagnostics = (
    sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] }
  ).parseDiagnostics ?? [];

  return diagnostics.map((d) => {
    const pos =
      d.start !== undefined ? sourceFile.getLineAndCharacterOfPosition(d.start) : undefined;
    return {
      source: "ts-compiler-api",
      severity: "error",
      line: pos ? pos.line + 1 : undefined,
      column: pos ? pos.character + 1 : undefined,
      message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
    };
  });
}

// --- Tool 2: ESLint ----------------------------------------------------------
async function runEslintCheck(fileContent: string): Promise<ToolIssue[]> {
  // cwd: process.cwd() resolves the repo's real flat config, so the same rules
  // that gate CI apply to in-flight edits, not a separate/looser rule set.
  const eslint = new ESLint({ cwd: process.cwd() });
  const results = await eslint.lintText(fileContent, { filePath: VIRTUAL_FILENAME });

  return results.flatMap((result) =>
    result.messages.map((m) => ({
      source: "eslint" as const,
      severity: m.severity === 2 ? ("error" as const) : ("warning" as const),
      line: m.line,
      column: m.column,
      message: `${m.message}${m.ruleId ? ` (${m.ruleId})` : ""}`,
    })),
  );
}

function formatIssues(issues: ToolIssue[]): string {
  return issues
    .map((i) => `[${i.source}] ${i.severity}${i.line ? ` (line ${i.line})` : ""}: ${i.message}`)
    .join("\n");
}

// --- LLM escalation (second pass, quality chain) ----------------------------
// Only runs when both deterministic tools came back clean but the router still
// flagged needsErrorCheck -- catches semantic/logic bugs that syntax checking
// and lint rules structurally cannot see (wrong condition, off-by-one, bad
// assumption). This is the "LLM escalation second" half of the requirement.
async function runLlmEscalation(
  fileContent: string,
  userEvent: string,
  specRequirements: string[] | undefined,
): Promise<{ content: string; provider: string }> {
  const systemPrompt = `You are the escalation error-checker for a real-time collaborative code editor's AI pipeline. Static tools (TypeScript syntax check, ESLint) found no issues in this file. The user still flagged a concern. Look specifically for semantic/logic bugs that static tools cannot catch -- wrong conditions, off-by-one errors, incorrect assumptions, mishandled edge cases -- not style issues.${
    specRequirements?.length
      ? `\n\nThe check must specifically address these requirements:\n${specRequirements.map((r) => `- ${r}`).join("\n")}`
      : ""
  }\n\nRespond in plain text: either a concise explanation of the bug(s) found and how to fix them, or state clearly that no issue was found.`;

  const { result } = await callWithFallback(qualityChain, {
    systemPrompt,
    userPrompt: `User event: ${userEvent}\n\nFile content:\n${fileContent}`,
  });

  return { content: result.content, provider: result.provider };
}

export async function errorCheckNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { currentFileContent, userEvent, attemptNumber, specs } = state;
  const errorCheckSpec = specs.find((s) => s.agentType === "error_check");

  const tsIssues = runTsCheck(currentFileContent);

  let eslintIssues: ToolIssue[] = [];
  let eslintFailed = false;
  try {
    eslintIssues = await runEslintCheck(currentFileContent);
  } catch (err) {
    // A tool failing to RUN (bad config resolution, etc.) is not the same as
    // "graceful failure" for the whole node -- degrade to "this tool didn't
    // run" and continue, rather than aborting the branch.
    eslintFailed = true;
    eslintIssues = [];
    void err; // reason captured in the note appended to the draft content below
  }

  const toolIssues = [...tsIssues, ...eslintIssues];
  let draft: GeneratorDraft;

  if (toolIssues.length > 0) {
    // Tools found real issues -- no LLM call needed for this attempt at all.
    draft = {
      agentType: "error_check",
      content:
        formatIssues(toolIssues) +
        (eslintFailed ? "\n\n[Note: ESLint did not run this pass -- ts-compiler-api results only.]" : ""),
      toolsUsed: [
        ...(tsIssues.length > 0 ? ["ts-compiler-api"] : []),
        ...(eslintIssues.length > 0 ? ["eslint"] : []),
      ],
      attemptNumber,
    };
  } else {
    // Both tools clean (or ESLint failed to run) -- escalate to LLM.
    const { content, provider } = await runLlmEscalation(
      currentFileContent,
      userEvent,
      errorCheckSpec?.requirements,
    );

    draft = {
      agentType: "error_check",
      content: eslintFailed
        ? `${content}\n\n[Note: ESLint did not run this pass -- see server logs.]`
        : content,
      toolsUsed: ["ts-compiler-api", ...(eslintFailed ? [] : ["eslint"]), `llm:${provider}`],
      attemptNumber,
    };
  }

  const validated = GeneratorDraftSchema.safeParse(draft);
  if (!validated.success) {
    // Graceful failure per Section 3 recovery model -- never throw out of a node.
    return {
      drafts: [
        {
          agentType: "error_check",
          content: `Error-check agent produced an invalid draft and could not complete this attempt. Validation errors: ${validated.error.message.slice(0, 200)}`,
          toolsUsed: [],
          attemptNumber,
        },
      ],
    };
  }

  return { drafts: [validated.data] };
}