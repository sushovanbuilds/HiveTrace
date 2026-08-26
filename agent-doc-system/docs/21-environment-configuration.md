# Environment Configuration

## Variables
| Variable | Required | Secret | Purpose | Example |
|---|---|---|---|---|
| `DATABASE_URL` | Yes (runtime) | Yes | Postgres connection string (P0.02) | `postgresql://...` |
| `HARDHAT_RPC_URL` | For deploys | No | Local EVM RPC (P1.02) | `http://127.0.0.1:8545` |
| `DEPLOYER_PRIVATE_KEY` | For non-local deploy | Yes | Signer for remote RPC only (P1.02) | — |
| `MAINNET_DEPLOY_APPROVED` | No | No | Approval gate for mainnet deploy (P4.02) | `false` |
| `ADMIN_API_KEY` | For write API | Yes | Bearer token for POST `/api/honeypots` (P2.02) | — |
| `LLM_PROVIDER` | No | No | `openai` (default) or `gemini` (P3.01) | `openai` |
| `OPENAI_API_KEY` | For OpenAI | Yes | OpenAI chat model key (P3.01) | — |
| `OPENAI_MODEL` | No | No | OpenAI model override | `gpt-4o` |
| `GOOGLE_API_KEY` | For Gemini | Yes | Gemini chat model key (P3.01) | — |
| `GEMINI_MODEL` | No | No | Gemini model override | `gemini-1.5-pro` |

Maintain `.env.example` without real secrets.

## Rules
- Never commit credentials.
- Use environment-specific secret management.
- Validate required configuration at startup where practical.
