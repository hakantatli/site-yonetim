# Code Standards & Engineering Guidelines

This document establishes the mandatory engineering standards, architectural conventions, and quality gates for the Site Management (Bina Portal) codebase. All contributors and automated agents must adhere to these standards.

---

## 1. Core Engineering Principles & Anti-AI-Slop Rules

1. **Zero Emoji Policy:**
   - Emojis are strictly forbidden across the repository: in source code, UI components, HTML templates, navbar items, buttons, CLI logs, commit messages, and Markdown documentation.
2. **Comment Minimalism:**
   - Write comments in **English only**, regardless of the communication language.
   - Ban "what" comments that merely narrate the code (e.g., `// check if user exists`).
   - Only write "why" comments to document non-obvious business logic, domain constraints, or deliberate trade-offs.
   - Do not write redundant DocBlocks or annotations where native language typing (Go / TypeScript) already specifies signatures.
3. **Guard Clauses & Early Returns:**
   - Do not nest execution paths inside deeply indented `if` blocks.
   - Validate preconditions, permissions, and request payloads upfront; exit or return errors immediately.
   - Keep the primary happy path un-indented at the top level of functions.
4. **Single Responsibility Principle (SRP):**
   - Avoid monolithic functions. Break complex workflows into small, focused, well-named helper routines.
5. **Utilitarian & Clean UI:**
   - Avoid generic marketing boilerplate, non-functional placeholder actions (`alert('demo')`), or arbitrary inline CSS gradients.
   - Keep UI design functional, accessible, responsive, and predictable.

---

## 2. Backend Standards (Go)

### Architecture Layers

The backend follows a strict unidirectional layered architecture:
- **Transport / Handlers (`internal/handler`):**
  - Parses HTTP requests, multipart forms, and query parameters.
  - Performs transport-level validation and delegates immediately to services.
  - Formats responses using consistent JSON helpers (`respondJSON`) or binary streams.
- **Service Layer (`internal/service`):**
  - Contains core domain logic, business validations, and financial rules.
  - Coordinates transactions across repositories.
  - Never imports HTTP-specific libraries (e.g., `net/http`, `chi`) unless dealing with stream interfaces.
- **Repository Layer (`internal/repository`):**
  - Encapsulates database access via SQLC generated queries and `pgxpool`.
  - Maps database types (`pgtype`) to domain models.
- **Domain Layer (`internal/domain`):**
  - Holds pure domain structures, request payloads, and shared business error types.
  - Zero external dependencies.

### Idiomatic Go Guidelines

- Always propagate `context.Context` from HTTP requests down to database operations.
- Always check and handle errors explicitly; never ignore errors with `_` unless explicitly documented why.
- Use structured logging (`slog`) with contextual attributes; do not use raw `fmt.Println` or `log.Printf`.
- Password security: Always hash passwords using `bcrypt` (default cost). Never store or compare plaintext credentials.
- Security & Multitenancy: Always enforce `SiteIsolationMiddleware` or verify `site_id` against user token claims on scoped routes.

---

## 3. Frontend Standards (React + TypeScript)

### Tech Stack & Tooling

- **React 19** with **Vite** as build tool and SPA bundler.
- **TypeScript** in strict mode; forbid `any` types. Define explicit types in `src/types/`.
- **Tailwind CSS** for styling; adhere to existing color palettes (`slate`, `blue`, `emerald`, `rose`).
- **TanStack Query (React Query)** for server state synchronization and caching.
- **Zustand** for local client state (e.g., authentication, toast notifications).
- **Lucide React** for UI icons.

### Component Design

- Extract reusable UI widgets into `src/components/`. Keep pages in `src/pages/` focused on layout orchestration.
- Handle loading, error, and empty states explicitly in every data-driven view.
- Strictly validate user inputs (e.g., file sizes, file types, currency inputs) before dispatching API mutations.
- Use semantic HTML tags (`<nav>`, `<main>`, `<section>`, `<header>`, `<table>`) with appropriate ARIA attributes for accessibility.

---

## 4. Database & Migration Standards

- Database: **PostgreSQL 16**.
- **Migrations (`backend/migrations/`):**
  - Handled via **Goose**.
  - Numbered sequentially (`00001_initial_schema.sql`, `00002_...sql`).
  - Every migration must include both `-- +goose Up` and `-- +goose Down` blocks.
- **Type-Safe Queries (`backend/internal/repository/queries/`):**
  - Managed via **SQLC**.
  - All SQL queries must be parameterized (`$1`, `$2`). Raw SQL string concatenation is forbidden.
  - Run `sqlc generate` inside `backend/` whenever queries or schemas are modified.
- **Data Integrity & Auditability:**
  - Soft delete critical entities (such as apartments) to preserve historical billing and payment records.
  - Maintain atomic database transactions (`Begin` / `Commit` / `Rollback`) for multi-step mutations (e.g., debt issuance, meter distribution, invoice file uploads).

---

## 5. Automated Backup & Disaster Recovery Standards

- **Cron Backups (`docker/backup`):**
  - Runs daily at `01:00 Europe/Istanbul` via Alpine-based `postgresql16-client`.
  - Dumps database with `--clean --if-exists --no-owner --no-privileges` into gzip-compressed `.sql.gz` files.
  - Enforces local retention of the last 15 backups (`MAX_BACKUPS=15`).
  - Automatically uploads to Oracle Cloud (OCI) Object Storage bucket if `OCI_BACKUP_PAR_URL` is set.
- **Pre-Deployment Backup:**
  - An instant `.sql.gz` snapshot of the production database must be triggered before applying new migrations or updating production containers.

---

## 6. Testing & Quality Gates

### Backend Tests
- Run full test suite with race detector:
  ```bash
  cd backend && go test -v -race ./...
  ```
- Run static analysis:
  ```bash
  cd backend && go vet ./...
  ```

### Frontend Tests & Quality
- Run unit tests:
  ```bash
  cd frontend && npm test -- --run
  ```
- Run linter:
  ```bash
  cd frontend && npx oxlint
  ```
- Run production type check and asset build:
  ```bash
  cd frontend && npm run build
  ```

---

## 7. Git & Deployment Operations

1. **Commit and Push Control:**
   - Changes may be staged and committed locally.
   - **Never run `git push` without explicit user instruction / approval.** Every push to `main` triggers automated CI/CD and production deployment.
2. **Zero-Downtime Docker Deployment:**
   - Do not take down containers with `docker compose down`.
   - Build images first while current version runs:
     ```bash
     docker compose -f docker-compose.yml -f docker-compose.prod.yml build
     ```
   - Switch containers seamlessly:
     ```bash
     docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans
     ```
3. **CI/CD Monitoring:**
   - Monitor deployment pipeline via GitHub CLI (`gh run list`, `gh run watch`) instead of manual SSH commands on the production host.
