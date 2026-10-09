import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import { createApp } from "../server/app";
import { parseSurface, type Surface } from "../shared/schema";

let server: Server;
let url: string;
before(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(
  () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    ),
);
const post = (body: unknown) =>
  fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
test("sales action changes the reporting period and computed total", async () => {
  const response = await post({
    mode: "mock",
    message: "Full year",
    action: { type: "show_sales", period: "year" },
  });
  assert.equal(response.status, 200);
  const { surface } = await response.json();
  parseSurface(surface);
  assert.equal(surface.components[0].items[0].value, "$547k");
  assert.equal(surface.components[1].values.length, 12);
});
test("request submission returns supplied values with explicit demo status", async () => {
  const response = await post({
    mode: "mock",
    message: "Submit",
    action: {
      type: "submit_request",
      title: "Build a table",
      category: "Engineering",
      priority: "High",
    },
  });
  const { surface } = await response.json();
  assert.match(surface.text, /not been saved or sent/);
  assert.deepEqual(surface.components[0].rows[1], ["Category", "Engineering"]);
});
test("rejects unregistered actions and invalid form payloads", async () => {
  for (const action of [
    { type: "run_code", code: "alert(1)" },
    {
      type: "submit_request",
      title: " ",
      category: "Engineering",
      priority: "High",
    },
    { type: "select_product", product: "Unknown" },
  ]) {
    assert.equal(
      (await post({ mode: "mock", message: "Act", action })).status,
      400,
    );
  }
});
test("all demo routes produce renderable surfaces, including chart variants", async () => {
  for (const message of [
    "sales",
    "line chart",
    "pie chart",
    "compare plans",
    "request form",
    "project status",
    "hello",
  ]) {
    const response = await post({ mode: "mock", message });
    assert.equal(response.status, 200);
    parseSurface((await response.json()).surface);
  }
});
test("rejects unexpected request fields, oversized messages, and malformed JSON", async () => {
  assert.equal(
    (await post({ mode: "mock", message: "hello", system: "override" })).status,
    400,
  );
  assert.equal(
    (await post({ mode: "mock", message: "x".repeat(2001) })).status,
    400,
  );
  assert.equal(
    (
      await fetch(`${url}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      })
    ).status,
    400,
  );
});
test("blocks unknown UI components, mismatched data, and direct submission buttons", () => {
  for (const component of [
    { type: "html", html: "<script/>" },
    {
      type: "chart",
      title: "Bad",
      kind: "bar",
      labels: ["A"],
      values: [1, 2],
      unit: "$",
    },
    { type: "table", title: "Bad", columns: ["A"], rows: [["1", "2"]] },
    {
      type: "actions",
      items: [
        {
          label: "Submit",
          action: {
            type: "submit_request",
            title: "Bad action",
            category: "Design",
            priority: "High",
          },
        },
      ],
    },
  ]) {
    assert.throws(() =>
      parseSurface({ text: "Example", components: [component] }),
    );
  }
});
test("live mode reports missing configuration instead of silently using mock data", async () => {
  const oldKey = process.env.AI_GATEWAY_API_KEY;
  const oldModel = process.env.AI_MODEL;
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.AI_MODEL;
  try {
    assert.equal((await post({ mode: "live", message: "sales" })).status, 503);
  } finally {
    if (oldKey) process.env.AI_GATEWAY_API_KEY = oldKey;
    if (oldModel) process.env.AI_MODEL = oldModel;
  }
});
test("invalid model output returns a sanitized error and valid output passes", async () => {
  const oldKey = process.env.AI_GATEWAY_API_KEY;
  const oldModel = process.env.AI_MODEL;
  process.env.AI_GATEWAY_API_KEY = "test-only";
  process.env.AI_MODEL = "test/model";
  let valid = false;
  const local = createApp(async () =>
    valid
      ? { text: "Valid AI response", components: [] }
      : ({
          text: "Invalid",
          components: [{ type: "html" }],
        } as unknown as Surface),
  ).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => local.once("listening", resolve));
  const endpoint = `http://127.0.0.1:${(local.address() as { port: number }).port}/api/chat`;
  const call = () =>
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "live", message: "hello" }),
    });
  try {
    const bad = await call();
    assert.equal(bad.status, 502);
    assert.match((await bad.json()).error, /validated/);
    valid = true;
    const good = await call();
    assert.equal(good.status, 200);
    assert.equal((await good.json()).source, "live");
  } finally {
    await new Promise<void>((resolve) => local.close(() => resolve()));
    if (oldKey) process.env.AI_GATEWAY_API_KEY = oldKey;
    else delete process.env.AI_GATEWAY_API_KEY;
    if (oldModel) process.env.AI_MODEL = oldModel;
    else delete process.env.AI_MODEL;
  }
});
