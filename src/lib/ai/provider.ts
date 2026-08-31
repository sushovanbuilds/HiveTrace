import {
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export type LlmProvider = "openai" | "gemini";

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
// §13 Gemini default is overridable via LLM_PROVIDER.
function resolveProvider(): LlmProvider {
  const raw = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  return raw === "gemini" || raw === "google" ? "gemini" : "openai";
}

/** The model name for the resolved provider, so an audit row cannot claim a
 *  gpt-4o answer came back when LLM_PROVIDER=gemini served it. */
export function resolveModelName(provider: LlmProvider = resolveProvider()): string {
  return provider === "gemini"
    ? (process.env.GEMINI_MODEL ?? "gemini-1.5-pro")
    : (process.env.OPENAI_MODEL ?? "gpt-4o");
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
  return Boolean(provider === "gemini" ? process.env.GOOGLE_API_KEY : process.env.OPENAI_API_KEY);
}

export function createChatModel(options: ChatModelOptions = {}): BaseChatModel {
  const provider = options.provider ?? resolveProvider();
  const temperature = options.temperature ?? 0;
  const maxTokens = options.maxTokens ?? 1024;

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
  return new ChatOpenAI({
    apiKey,
    model: options.model ?? process.env.OPENAI_MODEL ?? "gpt-4o",
    temperature,
    maxTokens,
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
