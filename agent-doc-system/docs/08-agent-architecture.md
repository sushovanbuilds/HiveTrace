# Agent Architecture

## Agent Topology
TBD

## Agents
| Agent | Purpose | Inputs | Outputs | Tools | Permissions | Success | Failure |
|---|---|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## Planning
Define how agents decompose work and when they should stop planning.

## Memory
Distinguish short-lived task context, durable project knowledge, and user data.

## Tool Policy
Every tool must have an explicit purpose, schema, timeout, error behavior, and permission boundary.

## Handoffs
TBD

## Human Approval Points
Required before destructive operations, privilege escalation, production changes, or other high-impact actions defined by the project.

## Failure Recovery
Use bounded retries, fallback strategies, and explicit escalation rather than infinite loops.
