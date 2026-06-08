import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test users from scripts/seed-local.mjs
// MO1 (audit): seed personas renamed exec*@brido.local; was "yurii@brido.local".
// exec4 is the pending (not-verified) executor.
const EXECUTOR_EMAIL = "exec4@brido.local";
// sponsor1 has moderator role granted by seed
const MODERATOR_EMAIL = "sponsor1@brido.local";
const PASSWORD = "password123";

const DOC_FIXTURE = path.resolve(__dirname, "../fixtures/test-doc.jpg");
const SELFIE_FIXTURE = path.resolve(__dirname, "../fixtures/test-selfie.jpg");

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/auth");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/app", { timeout: 10_000 });
}

test.describe("KYC happy path", () => {
  test("executor uploads -> moderator approves -> verification visible", async ({ page, context }) => {
    // 1. Executor uploads
    await login(page, EXECUTOR_EMAIL);
    await page.goto("/app/profile/kyc");
    await page.getByText("Верификация личности").waitFor();

    // Doc-type "Паспорт" is default selected; trigger file inputs by ref
    await page.locator('input[data-testid="kyc-doc-input"]').setInputFiles(DOC_FIXTURE);
    await page.locator('input[data-testid="kyc-selfie-input"]').setInputFiles(SELFIE_FIXTURE);

    await page.getByTestId("kyc-submit").click();

    // Pending banner should appear
    await expect(page.getByText("Заявка на проверке")).toBeVisible({ timeout: 10_000 });

    // 2. Sign out
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    // 3. Moderator login + approve
    await login(page, MODERATOR_EMAIL);
    await page.goto("/app/admin/kyc-queue");

    await page.getByText("KYC очередь").waitFor();
    const approveBtn = page.getByRole("button", { name: /Одобрить/i }).first();
    await expect(approveBtn).toBeVisible({ timeout: 10_000 });
    await approveBtn.click();

    // Toast confirmation
    await expect(page.getByText(/Одобрено/i)).toBeVisible({ timeout: 5_000 });
  });
});
