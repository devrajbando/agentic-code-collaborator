import { test, expect, chromium } from "@playwright/test";

test("two collaborators' concurrent agent requests do not cross-apply results", async () => {
  test.setTimeout(120_000);
  const browser = await chromium.launch();
  const alice = await (await browser.newContext()).newPage();
  const bob = await (await browser.newContext()).newPage();

  await alice.goto("/project/16bf1873-e68e-43f0-889c-9847e814f9dd");
  await bob.goto("/project/16bf1873-e68e-43f0-889c-9847e814f9dd");

  // Alice and Bob both click index.ts directly
  await alice.getByText("index.ts").click();
  await bob.getByText("index.ts").click();

  await alice.getByPlaceholder(/ask about/i).fill("add docs to this function");
  await alice.getByRole("button", { name: "Send" }).click();

  await bob.getByPlaceholder(/ask about/i).fill("check for bugs in this file");
  await bob.getByRole("button", { name: "Send" }).click();

  await expect(alice.getByText(/documentation/i)).toBeVisible({ timeout: 90_000 });
  await expect(alice.getByText(/error check/i)).not.toBeVisible();

  await expect(bob.getByText(/error check/i)).toBeVisible({ timeout: 90_000 });
  await expect(bob.getByText(/documentation/i)).not.toBeVisible();

  await browser.close();
});