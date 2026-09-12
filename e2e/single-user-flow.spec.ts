import { test, expect } from "@playwright/test";

test("full flow: login → open project → send agent command → accept a doc suggestion", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.goto("/project/16bf1873-e68e-43f0-889c-9847e814f9dd");

  await page.getByText("index.ts").click();

  // Update the prompt to be explicit so the LLM router correctly classifies it
  await page.getByPlaceholder(/ask about/i).fill("Generate documentation for the code in this file");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Working across the agent pipeline")).toBeVisible();
  await expect(page.getByText(/documentation/i)).toBeVisible({ timeout: 90_000 });

  await page.getByRole("button", { name: /^accept$/i }).click();
  await expect(page.getByText(/applied to editor/i)).toBeVisible();
});