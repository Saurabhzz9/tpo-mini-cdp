import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("optimized production release authenticates, renders real data and calls live Azure", async ({
  page,
}) => {
  const password = (await readFile(".local-access.txt", "utf8"))
    .match(/Password: (.+)/)![1]
    .trim();
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("admin");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Your audience, connected." }),
  ).toBeVisible();
  await expect(
    page.getByText("8,441 resolved website visits", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".recharts-area-curve")).toBeVisible();
  await page.screenshot({ path: "docs/overview.png", fullPage: true });
  await page.getByRole("link", { name: "Growth assistant AI" }).click();
  await page
    .getByRole("textbox", { name: "Ask Growth assistant" })
    .fill("How many Instagram signups are inactive?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.locator(".assistant-answer")).toBeVisible({
    timeout: 60000,
  });
  await page
    .getByText("Inspect the exact aggregate data sent to the model")
    .click();
  await expect(page.locator(".assistant-answer pre")).toContainText(
    '"inactive30Days": 86',
  );
  await page.screenshot({ path: "docs/assistant.png", fullPage: true });
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("2,900", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "docs/overview-mobile.png", fullPage: true });
});
