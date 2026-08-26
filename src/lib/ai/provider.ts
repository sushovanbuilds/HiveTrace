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
  invoke(messages: unknown): Promise<{ content: unknown }>;
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
  const model =
    opts.model ??
    createChatModel({
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
    });

  const messages: BaseMessage[] = [];
  if (opts.system) messages.push(new SystemMessage(opts.system));
  messages.push(new HumanMessage(opts.prompt));

  const result = await model.invoke(messages);
  return extractText(result.content);
}
