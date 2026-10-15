import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHmac } from "node:crypto";
const sign = (body: string, timestamp: string, secret: string) =>
  createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
async function login(page: Page, analyst = false) {
  await page.goto("/login");
  await page
    .getByLabel("Username", { exact: true })
    .fill(analyst ? "analyst" : "admin");
  await page
    .getByLabel("Password", { exact: true })
    .fill(analyst ? "e2e-analyst-password" : "e2e-test-password");
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Your audience, connected." }),
  ).toBeVisible();
}
test("protected pages and APIs deny unauthorized requests", async ({
  page,
  request,
}) => {
  await page.goto("/subscribers");
  await expect(page).toHaveURL(/login/);
  expect((await request.get("/api/people")).status()).toBe(401);
  expect((await request.post("/webhooks/app", { data: {} })).status()).toBe(
    401,
  );
  expect(
    (
      await request.post("/api/auth/login", {
        headers: { origin: "https://evil.example" },
        data: { username: "admin", password: "e2e-test-password" },
      })
    ).status(),
  ).toBe(403);
});
test("login, source-backed dashboard, search, unified profile, duplicate lineage and logout", async ({
  page,
}) => {
  await login(page);
  await expect(page.getByText("2,900", { exact: true })).toBeVisible();
  await expect(
    page.getByText("8,441 resolved website visits", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/overview-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Subscribers", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Filter readers" })
    .selectOption("duplicates");
  await expect(page.getByText("85 profiles")).toBeVisible();
  await page.locator(".person-link").first().click();
  await expect(
    page.getByRole("heading", { name: "Source lineage" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Connected identities" }),
  ).toBeVisible();
  await expect(page.getByText("1 duplicate row(s) preserved")).toBeVisible();
  await page.getByRole("link", { name: "All readers" }).click();
  await page.getByLabel("Search readers").fill("Instagram");
  await expect(page.getByText("899 profiles")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/login/);
  expect((await page.request.get("/api/people")).status()).toBe(401);
});
test("segment preview, save, edit, export and removal use real memberships", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Segments", exact: true }).click();
  await page
    .getByLabel("Segment name", { exact: true })
    .fill("E2E Instagram inactivity");
  await page.getByRole("button", { name: "Preview audience" }).click();
  await expect(page.getByText(/matching readers/).first()).toBeVisible();
  await page.getByRole("button", { name: "Save segment", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "E2E Instagram inactivity" }),
  ).toBeVisible();
  const card = page
    .locator(".saved-grid .card")
    .filter({ hasText: "E2E Instagram inactivity" });
  const downloadPromise = page.waitForEvent("download");
  await card.getByRole("link", { name: "Export CSV" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("tpo-segment.csv");
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Segment name", { exact: true })
    .fill("E2E updated segment");
  await page.getByRole("button", { name: "Update segment" }).click();
  await expect(
    page.getByRole("heading", { name: "E2E updated segment" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete E2E updated segment" })
    .click();
  await expect(
    page.getByRole("heading", { name: "E2E updated segment" }),
  ).toHaveCount(0);
});
test("signed live webhook delivery updates subscriber segments without restart", async ({
  page,
}) => {
  await login(page);
  const people = await (
    await page.request.get("/api/people?q=Instagram")
  ).json();
  const subscriber = people.people.find(
    (p: { app_ids: string[] }) => p.app_ids.length > 0,
  );
  expect(subscriber).toBeTruthy();
  const segment = {
    match: "all",
    rules: [{ field: "story_reads", operator: "gte", value: 1 }],
  };
  const before = await (
    await page.request.post("/api/segments/preview", {
      headers: { origin: "http://localhost:43187" },
      data: segment,
    })
  ).json();
  const event = {
    event_id: "e2e_live_read",
    event: "read_story",
    user_id: subscriber.app_ids[0],
    device_id: "e2e_live_device",
    timestamp: "2026-09-28T12:00:00Z",
    properties: { story: "assessment-test" },
  };
  const body = JSON.stringify(event),
    ts = String(Math.floor(Date.now() / 1000));
  const malformed = await page.request.post("/webhooks/app", {
    headers: {
      "content-type": "application/json",
      "x-tpo-timestamp": ts,
      "x-tpo-signature": `sha256=${sign("null", ts, "test-webhook-secret-at-least-32-characters-long")}`,
    },
    data: "null",
  });
  expect(malformed.status()).toBe(400);
  const response = await page.request.post("/webhooks/app", {
    headers: {
      "content-type": "application/json",
      "x-tpo-timestamp": ts,
      "x-tpo-signature": `sha256=${sign(body, ts, "test-webhook-secret-at-least-32-characters-long")}`,
    },
    data: body,
  });
  expect(response.status()).toBe(201);
  const after = await (
    await page.request.post("/api/segments/preview", {
      headers: { origin: "http://localhost:43187" },
      data: segment,
    })
  ).json();
  expect(after.count).toBe(before.count + 1);
  await page.goto(`/subscribers/${subscriber.id}`);
  await expect(page.getByText("read story", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Segments", exact: true }).click();
  await page.getByRole("button", { name: "Repeat app readers" }).click();
  await page.getByLabel("Condition 2 value").fill("1");
  await page.getByRole("button", { name: "Preview audience" }).click();
  await expect(
    page.getByRole("heading", { name: "1 matching readers" }),
  ).toBeVisible();
  const unknownBody = JSON.stringify({
    ...event,
    event_id: "e2e_unknown_read",
    user_id: "e2e_unknown_reader",
    device_id: "e2e_unknown_device",
  });
  const unknown = await page.request.post("/webhooks/app", {
    headers: {
      "content-type": "application/json",
      "x-tpo-timestamp": ts,
      "x-tpo-signature": `sha256=${sign(unknownBody, ts, "test-webhook-secret-at-least-32-characters-long")}`,
    },
    data: unknownBody,
  });
  expect(unknown.status()).toBe(201);
  await page.getByLabel("Audience scope").selectOption("all");
  await page.getByRole("button", { name: "Preview audience" }).click();
  await expect(
    page.getByRole("heading", { name: "2 matching readers" }),
  ).toBeVisible();
  await page.getByLabel("Audience scope").selectOption("newsletter");
  await page.getByRole("button", { name: "Preview audience" }).click();
  await expect(
    page.getByRole("heading", { name: "1 matching readers" }),
  ).toBeVisible();
});
test("Event Lab signs actual anonymous/login requests and preserves idempotency", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Event lab", exact: true }).click();
  await page.getByRole("button", { name: "Send signed event" }).click();
  await expect(page.locator(".response-block")).toContainText("201");
  await page
    .getByRole("combobox", { name: "Event type" })
    .selectOption("login");
  await page.getByLabel("Event time offset").fill("-5");
  await page.getByRole("button", { name: "Send signed event" }).click();
  await expect(page.getByText("Backfilled after login").first()).toBeVisible();
  await page.getByRole("button", { name: "Redeliver same event" }).click();
  await expect(page.locator(".response-block")).toContainText(
    '"duplicate": true',
  );
});
test("quality filters expose original rows and anonymous coverage", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Data quality", exact: true }).click();
  await page.getByLabel("Issue filter").selectOption("invalid_email");
  await expect(page.locator(".raw-record")).toHaveCount(2);
  await page.locator(".raw-record summary").first().click();
  await expect(page.locator(".raw-record pre").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Visitor identity coverage" }),
  ).toBeVisible();
});
test("AI reports missing configuration and blocks identifying input truthfully", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Growth assistant AI" }).click();
  await page
    .getByRole("textbox", { name: "Ask Growth assistant" })
    .fill("How many subscribers?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.locator(".notice[role=alert]")).toContainText(
    "Azure AI is not configured",
  );
  await page
    .getByRole("textbox", { name: "Ask Growth assistant" })
    .fill("Find alice@example.com");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.locator(".notice[role=alert]")).toContainText(
    "without personal information",
  );
});
test("analyst cannot import, use Event Lab, or bypass server authorization", async ({
  page,
}) => {
  await login(page, true);
  await expect(
    page.getByRole("link", { name: "Event lab", exact: true }),
  ).toHaveCount(0);
  expect(
    (
      await page.request.post("/api/lab/send", {
        headers: { origin: "http://localhost:43187" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/imports", {
        headers: { origin: "http://localhost:43187" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});
test("responsive layout keeps navigation and core tasks usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(page.getByText("2,900", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("link", { name: "Subscribers", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Every reader has a story." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/subscribers-mobile.png",
    fullPage: true,
  });
});
test("overview meets WCAG A/AA automated accessibility checks", async ({
  page,
}) => {
  await login(page);
  await expect(page.getByText("2,900", { exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});

test("delayed search responses cannot replace a newer query and shell settings stay server-rendered", async ({
  page,
}) => {
  await login(page);
  let settingsRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/settings") settingsRequests++;
  });
  let releaseOld!: () => void;
  const oldGate = new Promise<void>((resolve) => {
    releaseOld = resolve;
  });
  let oldStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    oldStarted = resolve;
  });
  await page.route("**/api/people?**", async (route) => {
    const q = new URL(route.request().url()).searchParams.get("q");
    if (q === "slow-old-query") {
      oldStarted();
      await oldGate;
      await route
        .fulfill({ json: { people: [], total: 999, page: 1 } })
        .catch(() => {});
    } else await route.continue();
  });
  await page.getByRole("link", { name: "Subscribers", exact: true }).click();
  await page.getByLabel("Search readers").fill("slow-old-query");
  await started;
  await page.getByLabel("Search readers").fill("Instagram");
  await expect(page.getByText("899 profiles")).toBeVisible();
  releaseOld();
  await expect(page.getByText("899 profiles")).toBeVisible();
  await expect(page.getByText("999 profiles")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Growth insights", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Signup cohorts" }),
  ).toBeVisible();
  expect(settingsRequests).toBe(0);
});
