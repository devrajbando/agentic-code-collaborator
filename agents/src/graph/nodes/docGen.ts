import * as ts from "typescript";
import { GeneratorDraftSchema, type GeneratorDraft } from "@rcc/types";
import { callWithFallback, buildQualityChain } from "../../llm/fallback.js";
import { createGroqProvider } from "../../llm/providers/groq.js";
import { createGeminiProvider } from "../../llm/providers/gemini.js";
import { createOpenRouterProvider } from "../../llm/providers/openrouter.js";
import type { GraphStateType } from "../state.js";

// Quality chain per Section 3: correctness-sensitive, not latency-sensitive.
const qualityChain = buildQualityChain(
  createGeminiProvider(),
  createOpenRouterProvider(),
  createGroqProvider(),
);

const VIRTUAL_FILENAME = "userFile.ts";

interface TargetFunction {
  name: string;
  paramsText: string[];
  returnTypeText: string | null;
  isAsync: boolean;
  hasLeadingDoc: boolean;
  bodyText: string;
}

type NamedFunctionNode = ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | ts.FunctionExpression;

// --- Tool: AST-based function locator + signature extractor -----------------
// Real tool per Section 1's requirement -- gives the LLM a structurally exact
// signature (param names/types, return type, async-ness) pulled from the
// parse tree, instead of asking it to re-derive that from prose (where it
// could invent a parameter that doesn't exist or miss one that does). It's
// also what makes scoping to "the relevant function" possible at all, rather
// than guessing across a whole file.
function findTargetFunction(fileContent: string, userEvent: string): TargetFunction | null {
  const sourceFile = ts.createSourceFile(
    VIRTUAL_FILENAME,
    fileContent,
    ts.ScriptTarget.Latest,
    true,
  );

  function hasLeadingDocComment(node: ts.Node): boolean {
    const ranges = ts.getLeadingCommentRanges(fileContent, node.getFullStart());
    return !!ranges?.some((r) => fileContent.slice(r.pos, r.pos + 3) === "/**");
  }

  const candidates: { name: string; container: ts.Node; fn: NamedFunctionNode; hasLeadingDoc: boolean }[] = [];

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      candidates.push({ name: node.name.text, container: node, fn: node, hasLeadingDoc: hasLeadingDocComment(node) });
    } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      candidates.push({ name: node.name.text, container: node, fn: node, hasLeadingDoc: hasLeadingDocComment(node) });
    } else if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.length === 1
    ) {
      const decl = node.declarationList.declarations[0];
      if (
        ts.isIdentifier(decl.name) &&
        decl.initializer &&
        (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
      ) {
        candidates.push({
          name: decl.name.text,
          container: node, // the whole `const x = (...) => ...` statement, for leading-comment purposes
          fn: decl.initializer,
          hasLeadingDoc: hasLeadingDocComment(node),
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (candidates.length === 0) return null;

  // Prefer a candidate explicitly named in the user event; else the first
  // undocumented function; else just the first function found.
  const lowerEvent = userEvent.toLowerCase();
  const chosen =
    candidates.find((c) => lowerEvent.includes(c.name.toLowerCase())) ??
    candidates.find((c) => !c.hasLeadingDoc) ??
    candidates[0];

  const params = chosen.fn.parameters.map((p) => p.getText(sourceFile));
  const returnType = chosen.fn.type ? chosen.fn.type.getText(sourceFile) : null;
  const isAsync = !!chosen.fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);

  return {
    name: chosen.name,
    paramsText: params,
    returnTypeText: returnType,
    isAsync,
    hasLeadingDoc: chosen.hasLeadingDoc,
    bodyText: chosen.container.getText(sourceFile),
  };
}

function fallbackDraft(reason: string, attemptNumber: number): GeneratorDraft {
  return {
    agentType: "doc_gen",
    content: reason,
    toolsUsed: ["ts-ast-parser"],
    attemptNumber,
  };
}

export async function docGenNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { currentFileContent, userEvent, attemptNumber, specs } = state;
  const docGenSpec = specs.find((s) => s.agentType === "doc_gen");

  const target = findTargetFunction(currentFileContent, userEvent);

  if (!target) {
    // Graceful failure per Section 3 recovery model: never a blank error, always
    // a usable, clearly-flagged partial result.
    return {
      drafts: [
        fallbackDraft(
          "No function found in the current file to document. The Doc-Gen agent looked for function declarations, methods, and arrow/function-expression assignments and found none.",
          attemptNumber,
        ),
      ],
    };
  }

  const systemPrompt = `You are the documentation-generation agent for a real-time collaborative code editor's AI pipeline. Write a JSDoc-style comment for the given function, using its EXACT signature (parameter names/types, return type) extracted below -- do not invent parameters or a return type not listed here.

Function name: ${target.name}
Parameters: ${target.paramsText.length ? target.paramsText.join(", ") : "(none)"}
Return type: ${target.returnTypeText ?? "(not explicitly annotated -- infer conservatively from the function body only if confident, otherwise omit @returns)"}
Async: ${target.isAsync}
${target.hasLeadingDoc ? "Note: this function already has a doc comment -- IMPROVE/replace it, don't just restate what's likely already there." : ""}
${
  docGenSpec?.requirements?.length
    ? `\nThe documentation must specifically address these requirements:\n${docGenSpec.requirements.map((r) => `- ${r}`).join("\n")}`
    : ""
}

Respond with ONLY the JSDoc comment block (starting with /**, ending with */), no surrounding prose, no markdown fences.`;
let result;
try {
  ({ result } = await callWithFallback(qualityChain, {
    systemPrompt,
    userPrompt: target.bodyText,
  }));
} catch (err) {
  return {
    drafts: [
      fallbackDraft(
        `Doc-Gen LLM call failed on all providers. Error: ${err instanceof Error ? err.message : String(err)}`,
        attemptNumber,
      ),
    ],
  };
}

  const content =
  typeof result.content === "string"
    ? result.content.trim()
    : null;
if (content === null) {
  return {
    drafts: [
      fallbackDraft(
        "Doc-Gen agent produced an invalid draft and could not complete this attempt. Validation errors: content must be a string.",
        attemptNumber,
      ),
    ],
  };
}
const draft: GeneratorDraft = {
  agentType: "doc_gen",
  content,
  toolsUsed: ["ts-ast-parser", `llm:${result.provider}`],
  attemptNumber,
};

  const validated = GeneratorDraftSchema.safeParse(draft);
  if (!validated.success) {
    // Graceful failure per Section 3 -- never throw out of a node.
    return {
      drafts: [
        fallbackDraft(
          `Doc-Gen agent produced an invalid draft and could not complete this attempt. Validation errors: ${validated.error.message.slice(0, 200)}`,
          attemptNumber,
        ),
      ],
    };
  }

  return { drafts: [validated.data] };
}