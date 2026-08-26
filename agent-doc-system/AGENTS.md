# AGENTS.md

## Purpose
This file is the entry point for all coding agents working in this repository.

## Before Coding
1. Read `AGENT_BOOTSTRAP.md`.
2. Read `docs/README.md`.
3. Read `00-project-context.md`, `01-product-requirements.md`, `02-project-scope.md`, and `03-tech-stack.md` when starting a new task or when context is unclear.
4. Read task-specific architecture, design, security, testing, and deployment documents as applicable.

## Workflow
UNDERSTAND
↓
PLAN
↓
DESIGN
↓
IMPLEMENT
↓
TEST
↓
REVIEW
↓
DOCUMENT
↓
VERIFY

## Instruction Precedence
User request → AGENTS.md → Project requirements → Architecture decisions → Technology-specific rules → General coding conventions.

When instructions conflict, follow the higher-precedence source and record important durable decisions in `docs/30-decisions.md`.

## Rules
- Inspect existing code before changing it.
- Reuse established patterns.
- Do not invent unknown requirements.
- Never expose secrets.
- Do not claim completion without verification.
- Ask before destructive or high-impact operations.
- Keep changes focused.
- Update durable documentation when the project changes.

## Completion
Use `docs/28-feature-completion-checklist.md` and `docs/26-agent-self-review.md` before declaring a task complete.
