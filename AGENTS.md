# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/` (Next.js App Router under `src/app`, feature modules in `src/features`, shared libs in `src/lib`, server logic in `src/backend`).
- UI: `src/components`, styles via Tailwind (see `postcss.config.mjs`).
- Data: Prisma schema/migrations in `prisma/`.
- Tests: unit/integration under `__tests__/` and `src/lib/__tests__/`; E2E in `tests/` (Playwright).
- Public assets: `public/`.

## Build, Test, and Development Commands
- `npm run dev`: Start Next.js on `http://localhost:3000`.
- `npm run build` / `npm start`: Production build and serve.
- `npm run lint`: ESLint with Next core-web-vitals rules.
- `npm test` / `npm run test:watch`: Jest unit/integration tests.
- `npm run test:e2e` (or `:headed`): Playwright E2E (baseURL from `E2E_BASE_URL` or `http://localhost:3000`).
- Database: `npm run db:migrate:dev`, `npm run db:push`, `npm run prisma:seed` (see other `db:*` scripts for prod/backup/sync).

## Coding Style & Naming Conventions
- Language: TypeScript (strict), React 19, Next.js 15 App Router.
- Imports: use `@/*` path alias (e.g., `import { x } from '@/lib/utils'`).
- Components/hooks: PascalCase files (e.g., `UserTable.tsx`), hooks `useThing.ts`.
- Tests: `*.test.ts`/`*.test.tsx` under `__tests__/`.
- Linting: run `npm run lint`. Do not instantiate `new PrismaClient()` directly; import the singleton from `@/lib/prisma` (enforced by ESLint).

## Testing Guidelines
- Frameworks: Jest (`jsdom`, `ts-jest`) and Playwright.
- Locations: unit/integration in `__tests__/`; E2E in `tests/`.
- Conventions: co-locate helpers under `__tests__/utils` if needed; name files `name.test.ts(x)`.
- E2E: ensure app running (`npm run dev`) or set `E2E_BASE_URL`.

## Commit & Pull Request Guidelines
- Style: Prefer Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`) as used in history.
- Include: concise summary, context, and linked issues.
- PRs must: describe changes, add screenshots for UI, note DB migrations/seeds, and include test coverage for new logic.
- Before opening: run `npm run lint`, `npm test`, and (if applicable) `npm run test:e2e`.

## Security & Configuration Tips
- Copy `.env.example` to `.env.local`; never commit secrets (`.env*` is gitignored).
- Production scripts use `dotenv-cli`; review `package.json` `db:*` commands.
- Backups are written to `backups/`; avoid storing sensitive dumps in VCS.
