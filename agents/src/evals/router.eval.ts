import { evaluate } from "langsmith/evaluation";
import { routerNode } from "../graph/nodes/router.js";
import { Client } from "langsmith";
interface RouterEvalCase {
  name: string;
  userEvent: string;
  currentFileContent: string;
  expected: { needsDocs: boolean; needsErrorCheck: boolean; needsSnippet: boolean } | null;
  rationale: string;
}

const FILE_WITH_UNDOCUMENTED_FN = `function add(a, b) {\n  return a + b;\n}`;
const FILE_WITH_BUG = `function verifyToken(token) {\n  if (token = "") { return false; }\n  return jwt.verify(token, SECRET);\n}`;

const cases: RouterEvalCase[] = [
  // --- Single, unambiguous intent -------------------------------------------
  {
    name: "clear docs-only request",
    userEvent: "add docs to this function",
    currentFileContent: FILE_WITH_UNDOCUMENTED_FN,
    expected: { needsDocs: true, needsErrorCheck: false, needsSnippet: false },
    rationale: "Baseline: unambiguous single-intent request should route to exactly one branch.",
  },
  {
    name: "clear error-check-only request",
    userEvent: "are there any bugs in this file?",
    currentFileContent: FILE_WITH_BUG,
    expected: { needsDocs: false, needsErrorCheck: true, needsSnippet: false },
    rationale: "Baseline: unambiguous bug-check request should not also trigger docs or snippet.",
  },
  {
    name: "clear snippet-only request",
    userEvent: "give me a function that debounces a callback",
    currentFileContent: FILE_WITH_UNDOCUMENTED_FN,
    expected: { needsDocs: false, needsErrorCheck: false, needsSnippet: true },
    rationale: "Baseline: unambiguous generation request should not also trigger docs or error-check.",
  },

  // --- Multi-intent: the harder, more realistic case -------------------------
  {
    name: "explicit multi-intent request (docs + error-check)",
    userEvent: "review this and add missing comments, also check for issues",
    currentFileContent: FILE_WITH_BUG,
    expected: { needsDocs: true, needsErrorCheck: true, needsSnippet: false },
    rationale: "Tests whether the router can split one message into two active branches instead of picking just one.",
  },
  {
    name: "implicit multi-intent (asks to 'fix and document')",
    userEvent: "can you fix this and document what it does",
    currentFileContent: FILE_WITH_BUG,
    expected: { needsDocs: true, needsErrorCheck: true, needsSnippet: false },
    rationale: "No explicit 'also' or list — tests whether the router infers two intents from natural phrasing, not just conjunction keywords.",
  },

  // --- Adversarial: things that should NOT over-trigger ----------------------
  {
    name: "snippet request mentioning 'error' in passing should not trigger error-check",
    userEvent: "give me a function that logs an error message to a file",
    currentFileContent: FILE_WITH_UNDOCUMENTED_FN,
    expected: { needsDocs: false, needsErrorCheck: false, needsSnippet: true },
    rationale: "Regression guard against naive keyword-matching -- 'error' appearing in a generation request shouldn't route to error_check.",
  },
  {
    name: "docs request mentioning a function name that sounds like a bug report",
    userEvent: "add documentation explaining what verifyToken checks for",
    currentFileContent: FILE_WITH_BUG,
    expected: { needsDocs: true, needsErrorCheck: false, needsSnippet: false },
    rationale: "The file happens to contain a real bug, but the user only asked for docs -- router should not volunteer an unrequested error-check.",
  },

  // --- Genuinely ambiguous: no strict expectation, just checking sane behavior
  {
    name: "vague request with no clear branch",
    userEvent: "help",
    currentFileContent: FILE_WITH_UNDOCUMENTED_FN,
    expected: null,
    rationale: "No sane 'correct' classification exists -- this case only checks the router doesn't crash and returns a low confidence score, not a specific routing.",
  },
  {
    name: "off-topic request unrelated to any branch",
    userEvent: "what's the weather like today",
    currentFileContent: FILE_WITH_UNDOCUMENTED_FN,
    expected: { needsDocs: false, needsErrorCheck: false, needsSnippet: false },
    rationale: "Router should be able to route to NOTHING when nothing applies, not force a branch just because one is 'closest'.",
  },
];

async function main() {
  const client = new Client();

  const datasetName = "router-classification-cases";

  let dataset;

  try {
    dataset = await client.readDataset({ datasetName });
  } catch {
    dataset = await client.createDataset(datasetName, {
      description: "Router classification evaluation cases",
    });

    await client.createExamples({
      inputs: cases.map((c) => ({
        userEvent: c.userEvent,
        currentFileContent: c.currentFileContent,
      })),
      outputs: cases.map((c) => ({
        expected: c.expected,
      })),
      metadata: cases.map((c) => ({
        name: c.name,
        rationale: c.rationale,
      })),
      datasetId: dataset.id,
    });
  }

  await evaluate(
    async (input: {
      userEvent: string;
      currentFileContent: string;
    }) => {
      return routerNode({
        userEvent: input.userEvent,
        currentFileContent: input.currentFileContent,
        hitlEnabled: { lowConfidence: false, attempt3Rejection: false },
      } as any);
    },
    {
      data: dataset.name,

      evaluators: [
        (run: any, example: any) => {
          const expected = example.outputs?.expected;
          const actual = run.outputs?.routerOutput;

          if (!expected) {
            const sane =
              actual != null &&
              actual.confidence < 0.6;

            return {
              key: "sane_low_confidence_on_ambiguous_input",
              score: sane ? 1 : 0,
              comment: sane
                ? undefined
                : `Expected low confidence on ambiguous input, got confidence=${actual?.confidence}`,
            };
          }

          const match =
            actual?.needsDocs === expected.needsDocs &&
            actual?.needsErrorCheck === expected.needsErrorCheck &&
            actual?.needsSnippet === expected.needsSnippet;

          return {
            key: "exact_classification_match",
            score: match ? 1 : 0,
            comment: match
              ? undefined
              : `Expected ${JSON.stringify(expected)}, got ${JSON.stringify({
                  needsDocs: actual?.needsDocs,
                  needsErrorCheck: actual?.needsErrorCheck,
                  needsSnippet: actual?.needsSnippet,
                })}`,
          };
        },
      ],

      experimentPrefix: "router-classification",
    },
  );
}

main().catch((err) => {
  console.error("Router eval failed to run:", err);
  process.exit(1);
});