import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = ["LLM_PROVIDER", "OLLAMA_BASE_URL", "OLLAMA_MODEL", "OLLAMA_TIMEOUT_MS"] as const;
const savedEnv: Record<string, string | undefined> = {};

function saveEnv() {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
}
function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
}

afterEach(() => {
  restoreEnv();
  vi.unstubAllGlobals();
});

function okResponse(body: unknown, evalCounts?: { prompt_eval_count: number; eval_count: number }) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      message: { role: "assistant", content: typeof body === "string" ? body : JSON.stringify(body) },
      ...(evalCounts ?? {}),
    }),
  };
}

describe("ollama provider", () => {
  it("isConfigured is false without OLLAMA_BASE_URL and true with it", async () => {
    saveEnv();
    const { isConfigured } = await import("@/lib/ai/provider");
    delete process.env.OLLAMA_BASE_URL;
    expect(isConfigured("ollama")).toBe(false);
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    expect(isConfigured("ollama")).toBe(true);
  });

  it("resolveModelName defaults to qwen3:27b and honours OLLAMA_MODEL", async () => {
    saveEnv();
    const { resolveModelName } = await import("@/lib/ai/provider");
    delete process.env.OLLAMA_MODEL;
    expect(resolveModelName("ollama")).toBe("qwen3:27b");
    process.env.OLLAMA_MODEL = "qwen3:8b";
    expect(resolveModelName("ollama")).toBe("qwen3:8b");
  });

  it("createChatModel throws a clear error when OLLAMA_BASE_URL is missing", async () => {
    saveEnv();
    const { createChatModel } = await import("@/lib/ai/provider");
    delete process.env.OLLAMA_BASE_URL;
    expect(() => createChatModel({ provider: "ollama" })).toThrow(/OLLAMA_BASE_URL/);
  });

  it("invoke posts to /api/chat and maps eval counters to usage", async () => {
    saveEnv();
    process.env.OLLAMA_BASE_URL = "http://ollama.test";
    const fetchMock = vi.fn(async () =>
      okResponse({ hello: "world" }, { prompt_eval_count: 12, eval_count: 34 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { OllamaChatModel } = await import("@/lib/ai/provider");
    const model = new OllamaChatModel({ model: "qwen3:27b" });
    const out = await model.invoke([
      { getType: () => "system", content: "sys" },
      { getType: () => "human", content: "hi" },
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://ollama.test/api/chat");
    const payload = JSON.parse(init.body as string) as {
      model: string;
      stream: boolean;
      messages: Array<{ role: string; content: string }>;
    };
    expect(payload.model).toBe("qwen3:27b");
    expect(payload.stream).toBe(false);
    expect(payload.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "hi" },
    ]);
    expect(out.content).toBe(JSON.stringify({ hello: "world" }));
    expect(out.usage_metadata).toEqual({ input_tokens: 12, output_tokens: 34 });
  });

  it("invoke throws on HTTP errors", async () => {
    saveEnv();
    process.env.OLLAMA_BASE_URL = "http://ollama.test";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 })));
    const { OllamaChatModel } = await import("@/lib/ai/provider");
    await expect(new OllamaChatModel().invoke("hi")).rejects.toThrow(/HTTP 500/);
  });

  it("invoke throws on non-JSON responses", async () => {
    saveEnv();
    process.env.OLLAMA_BASE_URL = "http://ollama.test";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("bad json");
        },
      })),
    );
    const { OllamaChatModel } = await import("@/lib/ai/provider");
    await expect(new OllamaChatModel().invoke("hi")).rejects.toThrow(/non-JSON/);
  });

  it("invoke throws on empty model replies", async () => {
    saveEnv();
    process.env.OLLAMA_BASE_URL = "http://ollama.test";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ message: { content: "   " } }),
      })),
    );
    const { OllamaChatModel } = await import("@/lib/ai/provider");
    await expect(new OllamaChatModel().invoke("hi")).rejects.toThrow(/empty message/);
  });

  it("invoke aborts when the model is slower than OLLAMA_TIMEOUT_MS", async () => {
    saveEnv();
    process.env.OLLAMA_BASE_URL = "http://ollama.test";
    process.env.OLLAMA_TIMEOUT_MS = "50";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, opts: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            opts.signal.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      ),
    );
    const { OllamaChatModel } = await import("@/lib/ai/provider");
    await expect(new OllamaChatModel().invoke("hi")).rejects.toThrow();
  });
});

function fakeView() {
  return {
    passport: { name: "Test Hive", code: "HT-001", farm: "Demo Farm", region: "Test Region" },
    assessment: {
      state: "WATCH",
      score: 62,
      factors: [
        { key: "temp-elevated", label: "Elevated temperature", detail: "38.2°C", severity: "watch" },
      ],
    },
    signals: {
      tempC: 38.2,
      humidityPct: 55,
      weightTrendKgPerDay: -0.2,
      activityIndex: 60,
      activityDelta: -8,
      varroaIndex: 1,
      broodPattern: "SOLID",
      daysSinceInspection: 9,
      colonyLost: false,
      hiveType: "LANGSTROTH",
    },
    confidence: "LOW DATA CONFIDENCE",
    observations: [
      { date: "2026-09-20", tempC: 38.2, humidityPct: 55, weightKg: 21.0, activityIndex: 60 },
    ],
    actions: [{ title: "Shade the hive", detail: "Add shade cloth" }],
  } as unknown as import("@/lib/hiveos/service").HiveOSView;
}

describe("hiveos advisor", () => {
  it("detectAlerts parses model JSON into hypotheses", async () => {
    const { detectAlerts } = await import("@/lib/hiveos/advisor");
    const mockModel = {
      invoke: vi.fn(async () => ({
        content: JSON.stringify({
          alerts: [
            {
              title: "Heat stress building",
              severity: "MEDIUM",
              rationale: "Temp above band for days.",
              evidenceRefs: ["temp-elevated"],
              suggestedAction: "Add shade cloth today.",
            },
          ],
        }),
      })),
    };
    const out = await detectAlerts(fakeView(), mockModel);
    expect(out.available).toBe(true);
    expect(out.items).toHaveLength(1);
    expect(out.items[0]?.title).toBe("Heat stress building");
    expect(out.model).toBe("injected");
    expect(out.notice).toMatch(/AI-drafted/);
  });

  it("recommendActions degrades gracefully when the model throws", async () => {
    const { recommendActions } = await import("@/lib/hiveos/advisor");
    const mockModel = {
      invoke: vi.fn(async () => {
        throw new Error("tunnel down");
      }),
    };
    const out = await recommendActions(fakeView(), mockModel);
    expect(out.available).toBe(false);
    expect(out.items).toEqual([]);
    expect(out.model).toBeNull();
  });

  it("detectAlerts degrades gracefully on unparsable model output", async () => {
    const { detectAlerts } = await import("@/lib/hiveos/advisor");
    const mockModel = { invoke: vi.fn(async () => ({ content: "not json at all" })) };
    const out = await detectAlerts(fakeView(), mockModel);
    expect(out.available).toBe(false);
    expect(out.items).toEqual([]);
  });

  it("returns unavailable when no model is configured and none is injected", async () => {
    saveEnv();
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.LLM_PROVIDER;
    const { detectAlerts, advisorModelName } = await import("@/lib/hiveos/advisor");
    const out = await detectAlerts(fakeView());
    expect(out.available).toBe(false);
    expect(advisorModelName()).toBeNull();
  });
});

describe("attention layer", () => {
  it("getAttentionQueue ranks hives and exposes reasons", async () => {
    const { getAttentionQueue } = await import("@/lib/attention/rank");
    const queue = await getAttentionQueue(3);
    expect(queue.total).toBeGreaterThan(0);
    expect(queue.items.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < queue.items.length; i++) {
      expect(queue.items[i - 1]!.attentionScore).toBeGreaterThanOrEqual(
        queue.items[i]!.attentionScore,
      );
    }
    for (const item of queue.items) {
      expect(item.attentionScore).toBeGreaterThanOrEqual(0);
      expect(item.attentionScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(item.reasons)).toBe(true);
    }
    expect(typeof queue.generatedAt).toBe("string");
  });

  it("briefAttention degrades gracefully when the model throws", async () => {
    const { briefAttention, getAttentionQueue } = await import("@/lib/attention/rank");
    const queue = await getAttentionQueue(2);
    const mockModel = {
      invoke: vi.fn(async () => {
        throw new Error("tunnel down");
      }),
    };
    const brief = await briefAttention(queue, mockModel);
    expect(brief.available).toBe(false);
    expect(brief.text).toBeNull();
  });
});
