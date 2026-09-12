import { test as setup } from "@playwright/test";
import jwt from "jsonwebtoken";

setup("authenticate", async ({ page, context }) => {
  console.log("E2E_TEST_USER_ID:", process.env.E2E_TEST_USER_ID);
  console.log("JWT_SECRET set:", !!process.env.JWT_SECRET);

  const token = jwt.sign(
    { userId: process.env.E2E_TEST_USER_ID, email: process.env.E2E_TEST_USER_EMAIL },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
  await context.addCookies([{
    name: "token", value: token, domain: "localhost", path: "/",
    httpOnly: true, sameSite: "Lax",
  }]);
  await page.goto("/");
  const meResponse = await page.request.get("http://localhost:4000/me"); // adjust to your real API port
  console.log("/me status:", meResponse.status(), await meResponse.text());

  await context.storageState({ path: "e2e/.auth/user.json" });
});