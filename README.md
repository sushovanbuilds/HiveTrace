# HiveTrace

HiveTrace is a honey traceability platform with role-based supply-chain workspaces, consumer QR verification, quality evidence, risk signals, and a deterministic presentation demo.

## Demo first

The polished demo flows run without a database. Start the app, open `/login`, and choose any displayed demo account. The shared demo password is `hivetrace-demo`. You can switch workspaces during a presentation and use `/verify` to explore consumer verification.

```bash
npm run dev
```

## Local database (optional)

Database-backed pages and API routes need PostgreSQL. Copy the supplied environment template, start the local service, generate the Prisma client, then create and seed the schema.

```bash
copy .env.example .env
docker compose up -d
npm run db:push
npm run db:seed
```

The Compose credentials already match `.env.example`. Before deploying, replace both secrets with different values and set `DATABASE_URL` for the target PostgreSQL instance.

## Checks

```bash
npm run lint
npm test
npm run build
```

`npm run build` does not require `DATABASE_URL`: Next.js can safely inspect route configuration at build time. Live database operations still fail clearly until `DATABASE_URL` is configured.
