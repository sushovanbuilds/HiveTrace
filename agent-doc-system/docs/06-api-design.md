# API Design

## API Style
TBD (REST / GraphQL / RPC / other)

## Conventions
- Validate all inputs at the boundary.
- Use consistent error shapes.
- Enforce authentication and authorization server-side.
- Version breaking changes.

## Endpoints
| Method | Path | Purpose | Auth | Request | Response |
|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD | TBD |

## Standard Error Shape
```json
{
  "error": {
    "code": "EXAMPLE_ERROR",
    "message": "Human-readable message",
    "requestId": "..."
  }
}
```

## Rate Limiting
TBD

## Versioning
TBD
