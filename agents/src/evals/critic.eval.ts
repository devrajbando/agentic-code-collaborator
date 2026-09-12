import { evaluate } from "langsmith/evaluation";
import type { Example } from "langsmith/schemas";
import { criticNode } from "../graph/nodes/critic.js";
import type { GeneratorDraft, SpecObject } from "@rcc/types";

interface CriticEvalInput {
  draft: GeneratorDraft;
  spec: SpecObject;
}

interface CriticEvalOutput {
  expectAccepted: boolean;
}

interface CriticRunOutput {
  criticVerdicts?: Array<{
    accepted?: boolean;
    reason?: string;
  }>;
}

async function main() {
  const results = await evaluate(
    async (input: CriticEvalInput): Promise<CriticRunOutput> => {
      const result = await criticNode({
        drafts: [input.draft],
        specs: [input.spec],
        attemptNumber: 1,
      } as any);

      return {
        criticVerdicts: result.criticVerdicts,
      };
    },
    {
      data: "critic-judgment-cases",

      evaluators: [
        (
          run: {
            outputs?: CriticRunOutput;
          },
          example?: Example,
        ) => {
          if (!example) {
            return {
              key: "critic_judgment_correct",
              score: 0,
              comment: "LangSmith did not provide an evaluation example.",
            };
          }

          const expected =
            (example.outputs as CriticEvalOutput | undefined)
              ?.expectAccepted;

          const verdict = run.outputs?.criticVerdicts?.[0];

          const actual = verdict?.accepted;

          const correct =
            actual !== undefined &&
            expected !== undefined &&
            actual === expected;

          return {
            key: "critic_judgment_correct",
            score: correct ? 1 : 0,
            comment: correct
              ? undefined
              : [
                  `Expected accepted=${expected}`,
                  `Got accepted=${actual}`,
                  `Reason: "${verdict?.reason ?? "No reason provided"}"`,
                  `Case: "${example.metadata?.name ?? "unknown"}"`,
                ].join(". "),
          };
        },
      ],

      experimentPrefix: "critic-judgment",
    },
  );

  console.log("\n=== Critic Eval Complete ===");
  console.log("Results have been sent to LangSmith.");

  return results;
}

main().catch((error) => {
  console.error("\nCritic eval failed to run:");
  console.error(error);
  process.exit(1);
});
