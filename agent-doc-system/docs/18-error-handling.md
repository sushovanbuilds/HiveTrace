# Error Handling

## Principles
- Fail explicitly and safely.
- Preserve useful diagnostic context.
- Give users actionable messages.
- Never expose secrets or internals unnecessarily.
- Do not silently swallow important failures.

## Error Categories
- User/input errors
- Authentication/authorization errors
- Network/API errors
- Database errors
- AI/model errors
- Agent/tool errors
- Timeout/rate-limit errors

## Recovery
Define retryability, backoff, fallback, and escalation for each critical dependency.
