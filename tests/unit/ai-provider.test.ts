import { describe, expect, it, vi } from "vitest";

describe("ai provider", () => {
  it("generateText returns content from an injected mock model", async () => {
    const { generateText } = await import("@/lib/ai/provider");
    const mockModel = {
      invoke: vi.fn(async () => ({ content: "mocked threat analysis" })),
    };

    const out = await generateText({
      system: "You are a security analyst.",
      prompt: "Summarize this attack tx.",
      model: mockModel,
    });

    expect(out).toBe("mocked threat analysis");
    expect(mockModel.invoke).toHaveBeenCalledOnce();
  });

  it("createChatModel throws a clear error when the provider key is missing", async () => {
    const { createChatModel } = await import("@/lib/ai/provider");

    const prevOpenAI = process.env.OPENAI_API_KEY;
    const prevGoogle = process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    try {
      expect(() => createChatModel({ provider: "openai" })).toThrow(
        /OPENAI_API_KEY/,
      );
      expect(() => createChatModel({ provider: "gemini" })).toThrow(
        /GOOGLE_API_KEY/,
      );
    } finally {
      if (prevOpenAI !== undefined) process.env.OPENAI_API_KEY = prevOpenAI;
      if (prevGoogle !== undefined) process.env.GOOGLE_API_KEY = prevGoogle;
    }
  });

  it("extracts text from array-shaped model output", async () => {
    const { generateText } = await import("@/lib/ai/provider");
    const mockModel = {
      invoke: vi.fn(async () => ({
        content: [
          { type: "text", text: "part one " },
          { type: "text", text: "part two" },
        ],
      })),
    };
    const out = await generateText({ prompt: "x", model: mockModel });
    expect(out).toBe("part one part two");
  });
});
