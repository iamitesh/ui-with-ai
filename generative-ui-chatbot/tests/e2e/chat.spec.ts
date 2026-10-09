import { test, expect } from "@playwright/test";
test("sales chart supports full-year action and JSON inspection", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Explore sales.*Turn numbers/ })
    .click();
  await expect(
    page.getByRole("img", { name: /Revenue over time/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Full year", exact: true }).click();
  await expect(page.getByText("$547k")).toBeVisible();
  await page.getByRole("button", { name: "View response JSON" }).click();
  await expect(page.getByRole("dialog")).toContainText('"type": "chart"');
});
test("comparison buttons create a conversational selection", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Compare plans.*Find the right/ })
    .click();
  await page.getByRole("button", { name: "Choose Studio" }).click();
  await expect(page.getByText(/You selected Studio/)).toBeVisible();
});
test("form submission validates input and confirms the selected values", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Create a request.*Get things/ })
    .click();
  await expect(
    page.getByRole("button", { name: "Submit demo request" }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Request title" })
    .fill("Design a settings page");
  await page.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: "Engineering" }).click();
  await page.getByRole("button", { name: "Submit demo request" }).click();
  await expect(page.getByText(/Demo request received/)).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Request summary" }),
  ).toContainText("Engineering");
});
test("keyboard send, progress and reset work without browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Message Canvas" })
    .fill("Show project status");
  await page.getByRole("textbox", { name: "Message Canvas" }).press("Enter");
  await expect(
    page.getByRole("progressbar", { name: "Design system" }),
  ).toHaveAttribute("aria-valuenow", "100");
  await page.getByRole("button", { name: "New conversation" }).first().click();
  await expect(
    page.getByRole("heading", { name: /More than answers/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile layout has no horizontal overflow and chart remains visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Message Canvas" })
    .fill("Show a line chart");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByRole("img", { name: /Revenue over time/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("server failure is shown and composer can retry", async ({ page }) => {
  await page.goto("/");
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "Generation unavailable. Try again." }),
    }),
  );
  await page.getByRole("textbox", { name: "Message Canvas" }).fill("hello");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert")).toContainText("Generation unavailable");
  await expect(
    page.getByRole("textbox", { name: "Message Canvas" }),
  ).toBeEnabled();
});
