import { Client } from "langsmith";
import type { GeneratorDraft, SpecObject } from "@rcc/types";

interface CriticEvalCase {
  name: string;
  agentType: "doc_gen" | "error_check" | "snippet_gen";
  draft: GeneratorDraft;
  spec: SpecObject;
  expectAccepted: boolean;
  rationale: string;
}

// -----------------------------------------------------------------------------
// doc_gen cases
// -----------------------------------------------------------------------------

const docGenCases: CriticEvalCase[] = [
  {
    name: "doc_gen: accurate doc matching real signature",
    agentType: "doc_gen",
    draft: {
      agentType: "doc_gen",
      content:
        "/**\n" +
        " * Adds two numbers.\n" +
        " * @param a - first addend\n" +
        " * @param b - second addend\n" +
        " * @returns the sum\n" +
        " */",
      attemptNumber: 1,
      toolsUsed: ["ts-ast-parser", "llm:gemini"],
    },
    spec: {
      agentType: "doc_gen",
      requirements: [
        "must document parameter a",
        "must document parameter b",
        "must document the return value",
      ],
      derivedFrom: "userEvent",
      confidence: 1,
      reasoning: "",
    },
    expectAccepted: true,
    rationale: "Baseline: correct, complete doc should pass.",
  },

  {
    name: "doc_gen: hallucinated parameter that doesn't exist in the spec",
    agentType: "doc_gen",
    draft: {
      agentType: "doc_gen",
      content:
        "/**\n" +
        " * Adds two numbers.\n" +
        " * @param a - first addend\n" +
        " * @param callback - invoked when complete\n" +
        " */",
      attemptNumber: 1,
      toolsUsed: ["ts-ast-parser", "llm:gemini"],
    },
    spec: {
      agentType: "doc_gen",
      requirements: [
        "must document exactly parameters a and b, no others",
        "function is synchronous, has no callback",
      ],
      derivedFrom: "userEvent",
      confidence: 1,
      reasoning: "",
    },
    expectAccepted: false,
    rationale:
      "Critic must catch a documented parameter that contradicts the real signature.",
  },

  {
    name: "doc_gen: missing a required parameter entirely",
    agentType: "doc_gen",
    draft: {
      agentType: "doc_gen",
      content:
        "/**\n" +
        " * Adds two numbers.\n" +
        " * @param a - first addend\n" +
        " */",
      attemptNumber: 1,
      toolsUsed: ["ts-ast-parser", "llm:gemini"],
    },
    spec: {
      agentType: "doc_gen",
      requirements: [
        "must document both parameters a and b",
        "must document the return value",
      ],
      derivedFrom: "userEvent",
      confidence: 1,
      reasoning: "",
    },
    expectAccepted: false,
    rationale:
      "Incomplete coverage of stated requirements should reject, not partial-credit pass.",
  },
];

// -----------------------------------------------------------------------------
// error_check cases
// -----------------------------------------------------------------------------

const errorCheckCases: CriticEvalCase[] = [
  {
    name: "error_check: correctly identifies the actual planted bug",
    agentType: "error_check",
    draft: {
      agentType: "error_check",
      content:
        "Line 2 uses assignment (`=`) instead of strict equality (`===`) inside the if condition, which always evaluates truthy after assigning an empty string, silently skipping the intended branch.",
      attemptNumber: 1,
      toolsUsed: ["llm:gemini"],
    },
    spec: {
      agentType: "error_check",
      requirements: [
        "must identify the assignment-vs-comparison bug in the conditional on line 2",
      ],
      derivedFrom: "userEvent",
      confidence: 1,
      reasoning: "",
    },
    expectAccepted: true,
    rationale:
      "Baseline: correct diagnosis of a known planted bug should pass.",
  },

  {
    name: "error_check: claims no issue when the spec requires identifying one",
    agentType: "error_check",
    draft: {
      agentType: "error_check",
      content:
        "No issues found. The code is correct and handles all cases properly.",
      attemptNumber: 1,
      toolsUsed: ["llm:gemini"],
    },
    spec: {
      agentType: "error_check",
      requirements: [
        "must identify the assignment-vs-comparison bug in the conditional on line 2",
      ],
      derivedFrom: "userEvent",
      confidence: 1,
      reasoning: "",
    },
    expectAccepted: false,
    rationale:
      "A false 'all clear' on a file with a known real bug is the single worst failure mode for this agent.",
  },

  {
    name: "error_check: identifies a real but different, unrequested issue",
    agentType: "error_check",
    draft: {
      agentType: "error_check",
      content:
        "The variable name 'x' is not descriptive; consider renaming for readability.",
      attemptNumber: 1,
      toolsUsed: ["llm:gemini"],
    },
    spec: {
      agentType: "error_check",
      requirements: [
        "must identify the assignment-vs-comparison bug in the conditional on line 2",
      ],
      derivedFrom: "userEvent",
      confidence: 1,
      reasoning: "",
    },
    expectAccepted: false,
    rationale:
      "A technically true but irrelevant output should not pass just because it identifies some issue.",
  },
];

// -----------------------------------------------------------------------------
// snippet_gen cases
// -----------------------------------------------------------------------------

const snippetGenCases: CriticEvalCase[] = [
  {
    name: "snippet_gen: correctly implements the stated requirement",
    agentType: "snippet_gen",
    draft: {
      agentType: "snippet_gen",
      content:
        "function cors(req, res, next) {\n" +
        "  res.setHeader('Access-Control-Allow-Origin', '*');\n" +
        "  next();\n" +
        "}",
      attemptNumber: 1,
      toolsUsed: ["llm:gemini"],
    },
    spec: {
      agentType: "snippet_gen",
      requirements: [
        "must set the Access-Control-Allow-Origin header",
      ],
      derivedFrom: "userEvent",
      confidence: 1,
      reasoning: "",
    },
    expectAccepted: true,
    rationale:
      "Baseline: correct, minimal, requirement-satisfying snippet should pass.",
  },

  {
    name: "snippet_gen: silently omits the one stated requirement",
    agentType: "snippet_gen",
    draft: {
      agentType: "snippet_gen",
      content:
        "function cors(req, res, next) {\n" +
        "  next();\n" +
        "}",
      attemptNumber: 1,
      toolsUsed: ["llm:gemini"],
    },
    spec: {
      agentType: "snippet_gen",
      requirements: [
        "must set the Access-Control-Allow-Origin header",
      ],
      derivedFrom: "userEvent",
      confidence: 1,
      reasoning: "",
    },
    expectAccepted: false,
    rationale:
      "A plausible-looking function that quietly does none of what was asked should fail.",
  },

  {
    name: "snippet_gen: satisfies the requirement but introduces an unrelated security issue",
    agentType: "snippet_gen",
    draft: {
      agentType: "snippet_gen",
      content:
        "function connectDB() {\n" +
        "  return mongoose.connect('mongodb://admin:password123@prod-db:27017');\n" +
        "}",
      attemptNumber: 1,
      toolsUsed: ["llm:gemini"],
    },
    spec: {
      agentType: "snippet_gen",
      requirements: [
        "must connect to the database",
        "must not hardcode credentials",
      ],
      derivedFrom: "userEvent",
      confidence: 1,
      reasoning: "",
    },
    expectAccepted: false,
    rationale:
      "Tests whether the critic checks all stated requirements, not just the first one.",
  },
];

// -----------------------------------------------------------------------------
// Dataset creation
// -----------------------------------------------------------------------------

const allCases = [
  ...docGenCases,
  ...errorCheckCases,
  ...snippetGenCases,
];

const client = new Client();

async function main() {
  const datasetName = "critic-judgment-cases";

  console.log(`Creating LangSmith dataset: ${datasetName}`);

  const dataset = await client.createDataset(datasetName, {
    description:
      "Evaluation cases for the critic agent in the real-time code collaborator.",
  });

  await client.createExamples({
    inputs: allCases.map((testCase) => ({
      draft: testCase.draft,
      spec: testCase.spec,
    })),

    outputs: allCases.map((testCase) => ({
      expectAccepted: testCase.expectAccepted,
    })),

    metadata: allCases.map((testCase) => ({
      name: testCase.name,
      rationale: testCase.rationale,
      agentType: testCase.agentType,
    })),

    datasetId: dataset.id,
  });

  console.log("\n=== Dataset Created ===");
  console.log(`Name: ${datasetName}`);
  console.log(`ID: ${dataset.id}`);
  console.log(`Cases: ${allCases.length}`);

  console.log("\nCases by agent type:");
  console.log(`doc_gen: ${docGenCases.length}`);
  console.log(`error_check: ${errorCheckCases.length}`);
  console.log(`snippet_gen: ${snippetGenCases.length}`);
}

main().catch((error) => {
  console.error("Failed to create critic dataset:", error);
  process.exit(1);
});