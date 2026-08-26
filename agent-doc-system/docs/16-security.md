# Security

## Baseline
- Never commit secrets.
- Validate untrusted input.
- Enforce authorization server-side.
- Use least privilege.
- Pin or constrain dependencies where appropriate.
- Avoid logging sensitive data.

## Agentic AI Security
Agents must not, without appropriate approval and safeguards:
- Exfiltrate secrets.
- Access unrelated private files.
- Execute destructive commands.
- Modify production systems.
- Disable security controls to bypass failures.

## AI Threats
Consider prompt injection, tool abuse, data exfiltration, insecure tool schemas, indirect prompt injection, and untrusted retrieval content.

## Web / API
Consider authentication, authorization, injection, SSRF, CSRF where relevant, rate limiting, request size limits, and secure headers.
