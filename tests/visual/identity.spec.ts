import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("visual identity across desktop and mobile feature boundaries", async ({
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
  for (const view of [
    "overview",
    "segments",
    "quality",
    "insights",
    "assistant",
    "settings",
  ]) {
    await page.goto("/" + view);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator(".loading-state")).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(view + "-desktop.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.001,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const view of ["overview", "segments", "assistant"]) {
    await page.goto("/" + view);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator(".loading-state")).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page).toHaveScreenshot(view + "-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.001,
    });
  }
});
