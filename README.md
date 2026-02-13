# COT UCC Portal (Next.js MVP)

A lightweight Next.js web app to:
- Create UCC search orders (state + deadline + search types)
- Submit to Circle of Trust (COT) via provider adapter (stubbed)
- Track status with a timeline and live updates (SSE)
- Accept webhook updates and store deliverables
- Fallback polling endpoint for cron/watchdog

## Quick start

1) Install deps
```bash
npm install
```

2) Configure env
```bash
cp .env.example .env
# fill DATABASE_URL
```

3) Prisma
```bash
npx prisma generate
npx prisma migrate dev --name init
```

4) Run
```bash
npm run dev
```

Open http://localhost:3000

## Notes
- `lib/providers/cot/client.ts` is a stub until you have real COT API docs.
- SSE endpoint is implemented using a DB polling loop (fine for low volume MVP).
- Polling endpoint: `POST /api/internal/poll-cot` with header `x-internal-secret: <INTERNAL_POLL_SECRET>`
