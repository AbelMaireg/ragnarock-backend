COMPOSE_FILE ?= ./docker/development/docker-compose.yml
COMPOSE_STAGING ?= ./docker/staging/docker-compose.yml
DC := docker compose -f $(COMPOSE_FILE)
DC_STAGING := docker compose -f $(COMPOSE_STAGING)

# ─── Docker (development) ─────────────────────────────────────────────
.PHONY: up up-d down build rebuild restart logs ps

up:
	$(DC) up --build

up-d:
	$(DC) up --build -d

down:
	$(DC) down

build:
	$(DC) build

rebuild:
	$(DC) down
	$(DC) up --build

restart:
	$(DC) restart

logs:
	$(DC) logs -f

ps:
	$(DC) ps

# ─── Docker (staging) ─────────────────────────────────────────────────
.PHONY: staging-up staging-up-d staging-down staging-build staging-logs

staging-up:
	$(DC_STAGING) up --build

staging-up-d:
	$(DC_STAGING) up --build -d

staging-down:
	$(DC_STAGING) down

staging-build:
	$(DC_STAGING) build

staging-logs:
	$(DC_STAGING) logs -f

# ─── Dev (local, no Docker) ──────────────────────────────────────────
.PHONY: dev dev-admin dev-debug install

install:
	bun install

dev:
	bun run start:dev

dev-admin:
	bun run start:admin:dev

dev-debug:
	bun run start:debug

# ─── Build ────────────────────────────────────────────────────────────
.PHONY: build-nest start-prod

build-nest:
	bun run build

start-prod:
	bun run start:prod

# ─── Prisma ───────────────────────────────────────────────────────────
.PHONY: prisma-generate prisma-migrate prisma-studio

prisma-generate:
	bun run prisma:generate

prisma-migrate:
	bun run prisma:migrate:dev

prisma-studio:
	bunx prisma studio

# ─── Lint / Format ────────────────────────────────────────────────────
.PHONY: lint format

lint:
	bun run lint

format:
	bun run format

# ─── Test ─────────────────────────────────────────────────────────────
.PHONY: test test-watch test-cov test-e2e test-e2e-admin

test:
	bun run test

test-watch:
	bun run test:watch

test-cov:
	bun run test:cov

test-e2e:
	bun run test:e2e

test-e2e-admin:
	bun run test:e2e:admin
