import { test } from "node:test";
import assert from "node:assert/strict";
import { generateLive, createApp } from "../server/app";

test("live generation calls OpenAI directly with the key and default or overridden model", async (t) => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = "test-only-openai-key";
  delete process.env.OPENAI_MODEL;
  const requests: {
    url: string;
    authorization: string | null;
    body: Record<string, unknown>;
  }[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({
        url: String(input),
        authorization: new Headers(init?.headers).get("authorization"),
        body: JSON.parse(String(init?.body)),
      });
      return new Response(
        JSON.stringify({
          id: "resp_test",
          created_at: 0,
          model: "gpt-5-mini",
          status: "completed",
          output: [
            {
              type: "message",
              id: "msg_test",
              role: "assistant",
              status: "completed",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    text: "Verified response",
                    components: [],
                  }),
                  annotations: [],
                },
              ],
            },
          ],
          usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  );
  try {
    const request = { mode: "live" as const, message: "Hello", history: [] };
    assert.equal((await generateLive(request)).text, "Verified response");
    assert.equal(requests[0].url, "https://api.openai.com/v1/responses");
    assert.equal(requests[0].authorization, "Bearer test-only-openai-key");
    assert.equal(requests[0].body.model, "gpt-5-mini");
    process.env.OPENAI_MODEL = "gpt-5-mini-2025-08-07";
    await generateLive(request);
    assert.equal(requests[1].body.model, "gpt-5-mini-2025-08-07");
  } finally {
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = oldModel;
  }
});

test("live mode is available with only an OpenAI key and no model override", async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = "test-only-openai-key";
  delete process.env.OPENAI_MODEL;
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${(server.address() as { port: number }).port}/api/config`,
    );
    assert.deepEqual(await response.json(), { liveAvailable: true });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = oldModel;
  }
});
