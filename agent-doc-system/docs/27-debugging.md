# Debugging

```text
REPRODUCE → ISOLATE → UNDERSTAND → HYPOTHESIZE → TEST → FIX → REGRESSION TEST → DOCUMENT
```

## Rules
- Reproduce before changing code when possible.
- Change one relevant hypothesis at a time.
- Prefer evidence from logs, traces, tests, and minimal reproductions.
- Add regression coverage for important fixes.
- Avoid random multi-file edits.
