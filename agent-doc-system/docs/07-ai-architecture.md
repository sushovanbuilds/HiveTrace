# AI Architecture

## Goals
- TBD

## Models
| Role | Provider | Model | Reason | Fallback |
|---|---|---|---|---|
| Primary (default) | OpenAI | `gpt-4o` (env `OPENAI_MODEL`) | D1 recommended default for tooling stability | Gemini |
| Alternative | Google Gemini | `gemini-1.5-pro` (env `GEMINI_MODEL`) | Plan §13 deep-reasoning default; swappable | OpenAI |

Provider is selected at runtime via `LLM_PROVIDER` (`openai` | `gemini`); defaults to OpenAI (D1). Keys read from `OPENAI_API_KEY` / `GOOGLE_API_KEY`. Abstraction lives in `src/lib/ai/provider.ts` over LangChain `@langchain/core` + `@langchain/openai` + `@langchain/google-genai`; any chat model can be injected for tests.

## Model Selection
Selection should consider capability, latency, reliability, privacy, context length, and cost. Overridable per-call via `createChatModel({ model })`. Default `temperature=0`, `maxTokens=1024` (plan §13).

## Prompt Architecture
- System instructions: stable project policy.
- Task context: request-specific context.
- Retrieved context: only relevant, trusted sources.
- Tool results: validated before use.

## Context Management
TBD

## RAG / Embeddings
TBD; use only when retrieval materially improves the product.

## Tool Calling
Define allowed tools, schemas, permissions, validation, and timeouts.

## Structured Outputs
Prefer schema-validated outputs for machine-consumed data.

## Streaming
TBD

## Fallbacks
TBD

## Token / Cost Controls
- Track token usage where available.
- Limit unbounded context.
- Cache safe repeated work.
- Prefer smaller models for deterministic/simple tasks.

## Evaluation
Define representative test sets, pass/fail thresholds, and regression checks.

## Hallucination Mitigation
- Ground factual answers in trusted sources where required.
- Clearly mark uncertainty.
- Validate tool outputs.
- Avoid claiming actions that were not executed.
