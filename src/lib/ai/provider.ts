import {
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export type LlmProvider = "openai" | "gemini" | "ollama";

// Minimal structural type so callers (and tests) can inject any chat model
// without depending on LangChain's full BaseChatModel surface.
export interface ChatModelLike {
  invoke(messages: unknown): Promise<{
    content: unknown;
    /** LangChain's normalised usage counters; absent on providers that omit them. */
    usage_metadata?: { input_tokens?: number; output_tokens?: number };
  }>;
}

/** What the provider actually charged for, when it says. Never guessed. */
export interface Usage {
  tokensIn: number | null;
  tokensOut: number | null;
}

export interface GenerateResult {
  text: string;
  /** The model that answered, for the audit row — not the one we hoped for. */
  model: string;
  usage: Usage;
}

export interface ChatModelOptions {
  provider?: LlmProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateOptions {
  prompt: string;
  system?: string;
  model?: ChatModelLike;
  temperature?: number;
  maxTokens?: number;
}

// D1 recommends OpenAI as the initial default (tooling stability); the plan's
// §13 Gemini default is overridable via LLM_PROVIDER. "ollama" targets a
// self-hosted Ollama server (e.g. a Cloudflare-tunnelled local model) — no API
// key, the base URL is the credential.
function resolveProvider(): LlmProvider {
  const raw = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  if (raw === "gemini" || raw === "google") return "gemini";
  if (raw === "ollama") return "ollama";
  return "openai";
}

/** The model name for the resolved provider, so an audit row cannot claim a
 *  gpt-4o answer came back when LLM_PROVIDER=gemini served it. */
export function resolveModelName(provider: LlmProvider = resolveProvider()): string {
  if (provider === "gemini")
    return process.env.GEMINI_MODEL ?? "gemini-1.5-pro";
  if (provider === "ollama") return process.env.OLLAMA_MODEL ?? "qwen3:27b";
  return process.env.OPENAI_MODEL ?? "gpt-4o";
}

/**
 * Whether a key is present for the resolved provider.
 *
 * Callers check this instead of catching the throw from `createChatModel`,
 * because "nobody configured a key" is a 503 the operator must fix, not the
 * same class of failure as a model refusing or timing out — and the two are
 * indistinguishable once flattened into one catch block.
 */
export function isConfigured(provider: LlmProvider = resolveProvider()): boolean {
  if (provider === "gemini") return Boolean(process.env.GOOGLE_API_KEY);
  if (provider === "ollama") return Boolean(process.env.OLLAMA_BASE_URL?.trim());
  return Boolean(process.env.OPENAI_API_KEY);
}

/* ── Ollama (self-hosted, OpenAI-compatible-ish chat via /api/chat) ─────── */

/**
 * Base URL of the Ollama server, e.g. http://localhost:11434 or a
 * tunnelled public URL. Thrown lazily so importing this module never crashes
 * the build when the variable is absent.
 */
export function ollamaBaseUrl(): string {
  const raw = process.env.OLLAMA_BASE_URL?.trim().replace(/\/+$/, "");
  if (!raw) {
    throw new Error(
      "OLLAMA_BASE_URL is required for the ollama provider (e.g. http://localhost:11434)",
    );
  }
  return raw;
}

/** Call timeout in ms. A 27B model over a tunnel can take a while to answer. */
export function ollamaTimeoutMs(): number {
  const raw = process.env.OLLAMA_TIMEOUT_MS;
  if (!raw) return 120_000;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("OLLAMA_TIMEOUT_MS must be a positive integer (milliseconds).");
  }
  return parsed;
}

function toOllamaRole(message: unknown): "system" | "assistant" | "user" {
  const rec = message as Record<string, unknown> | null | undefined;
  const getType =
    rec && typeof rec.getType === "function"
      ? (rec.getType as () => string)()
      : rec && typeof rec._getType === "function"
        ? (rec._getType as () => string)()
        : typeof rec?.type === "string"
          ? rec.type
          : "";
  if (getType === "system") return "system";
  if (getType === "ai") return "assistant";
  return "user";
}

interface OllamaChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Minimal Ollama chat client shaped as a ChatModelLike so it plugs into
 * generate()/generateText() with no new dependencies. Speaks Ollama's
 * /api/chat (non-streaming). Throws at construction when OLLAMA_BASE_URL is
 * missing; invoke()-time failures (network, timeout, bad JSON) throw too, so
 * callers can degrade gracefully.
 */
export class OllamaChatModel implements ChatModelLike {
  private readonly base: string;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(options: OllamaChatOptions = {}) {
    // Fail fast with an operator-actionable message, mirroring the
    // openai/gemini branches. Construction happens per-request, never at
    // import time, so this cannot crash the build.
    this.base = ollamaBaseUrl();
    this.model = options.model ?? process.env.OLLAMA_MODEL ?? "qwen3:27b";
    this.temperature = options.temperature ?? 0;
    this.maxTokens = options.maxTokens ?? 1024;
  }

  async invoke(messages: unknown): Promise<{
    content: unknown;
    usage_metadata?: { input_tokens?: number; output_tokens?: number };
  }> {
    const base = this.base;
    const list = Array.isArray(messages) ? messages : [messages];
    const payload = {
      model: this.model,
      stream: false,
      messages: list.map((m) => ({
        role: toOllamaRole(m),
        content: extractText((m as Record<string, unknown>)?.content),
      })),
      options: { temperature: this.temperature, num_predict: this.maxTokens },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ollamaTimeoutMs());
    let res: Response;
    try {
      res = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      throw new Error(
        `Ollama request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new Error(`Ollama returned HTTP ${res.status} for /api/chat`);
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new Error("Ollama returned a non-JSON response for /api/chat");
    }
    const content = (body as { message?: { content?: unknown } })?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      throw new Error("Ollama returned an empty message for /api/chat");
    }
    // Ollama reports real eval counters on non-streaming responses; map them
    // instead of leaving usage null.
    const evalCount = (body as { eval_count?: unknown }).eval_count;
    const promptEvalCount = (body as { prompt_eval_count?: unknown }).prompt_eval_count;
    return {
      content,
      usage_metadata: {
        ...(typeof promptEvalCount === "number" ? { input_tokens: promptEvalCount } : {}),
        ...(typeof evalCount === "number" ? { output_tokens: evalCount } : {}),
      },
    };
  }
}

export function createChatModel(options: ChatModelOptions = {}): BaseChatModel | ChatModelLike {
  const provider = options.provider ?? resolveProvider();
  const temperature = options.temperature ?? 0;
  const maxTokens = options.maxTokens ?? 1024;

  if (provider === "ollama") {
    return new OllamaChatModel({
      model: options.model ?? process.env.OLLAMA_MODEL ?? "qwen3:27b",
      temperature,
      maxTokens,
    });
  }

  if (provider === "gemini") {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is required for the gemini provider");
    }
    return new ChatGoogleGenerativeAI({
      apiKey,
      model: options.model ?? process.env.GEMINI_MODEL ?? "gemini-1.5-pro",
      temperature,
      maxOutputTokens: maxTokens,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for the openai provider");
  }
  // OPENAI_BASE_URL lets the "openai" provider also target any OpenAI-compatible
  // gateway (OpenRouter, Together, a local vLLM) without a new code path.
  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  return new ChatOpenAI({
    apiKey,
    model: options.model ?? process.env.OPENAI_MODEL ?? "gpt-4o",
    temperature,
    maxTokens,
    // Omitted entirely when unset, so the real OpenAI default applies rather
    // than an empty-string base URL.
    ...(baseURL ? { configuration: { baseURL } } : {}),
  });
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string"
          ? part
          : "text" in (part as Record<string, unknown>)
            ? String((part as Record<string, unknown>).text)
            : "",
      )
      .join("");
  }
  return String(content);
}

export async function generateText(opts: GenerateOptions): Promise<string> {
  return (await generate(opts)).text;
}

/**
 * Like `generateText`, but also returns what the call cost and which model
 * answered. Persisting an analysis needs both; the previous caller hardcoded
 * `tokensIn: 0, tokensOut: 0`, which is fabricated telemetry in a table whose
 * whole purpose is to account for model spend.
 */
export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const injected = opts.model !== undefined;
  const model =
    opts.model ??
    createChatModel({
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
    });

  const messages: BaseMessage[] = [];
  if (opts.system) messages.push(new SystemMessage(opts.system));
  messages.push(new HumanMessage(opts.prompt));

  const result = await (model as ChatModelLike).invoke(messages);
  const usage = result.usage_metadata;

  return {
    text: extractText(result.content),
    model: injected ? "injected" : resolveModelName(),
    // Only what the provider reported. A missing counter stays null rather than
    // becoming a zero that reads as "this call was free".
    usage: {
      tokensIn: typeof usage?.input_tokens === "number" ? usage.input_tokens : null,
      tokensOut: typeof usage?.output_tokens === "number" ? usage.output_tokens : null,
    },
  };
}
