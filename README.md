# Makeup Artist Booking Platform - Backend

Backend service for a location-based makeup artist booking platform that connects clients with nearby artists, supports booking workflows, and implements a points-driven visibility model.

This repository is built with NestJS + TypeScript and managed with Bun.

## Workspace Layout

This backend uses a NestJS monorepo layout:

- `apps/main` - primary API application
- `apps/admin` - admin-facing API application
- `libs/config` - shared configuration module (env loading + validation)
- `libs/logger` - shared Winston-based logger module
- `libs/uploader` - shared file storage module (local or S3 strategy)

## Product Scope

Based on `docs/requirements-and-specs.md`, the platform supports three user roles:

- Client: discover artists by location, book services, and leave ratings/reviews
- Artist: manage profile, services, availability, points, bookings, and commissions
- Admin: manage catalogs, point packages, users, and moderation

## Core Functional Requirements

The backend is expected to cover these launch-critical (P0) capabilities:

- Location-first discovery using GPS + kilometer radius
- Artist onboarding with mandatory location, service selection, and portfolio uploads
- Client and artist authentication, password reset, and session timeout handling
- Booking lifecycle: pending, accepted, declined, completed, cancelled, expired
- Points system:
  - 500 welcome points for each new artist
  - 20-point deduction when booking is accepted
  - 10-point deduction when client reveals contact details
  - auto-hide artists from discovery at 0 points
- Ratings and reviews after completed bookings
- Admin management for service catalog, point packages, user moderation, and metrics

For the complete requirements catalog (FR/NFR IDs, priorities, and open questions), see `docs/requirements-and-specs.md`.

## Non-Functional Targets

- Responsive web support across desktop/tablet/mobile clients
- Search responses within 3 seconds; page render target within 2 seconds
- Security baseline: password hashing, HTTPS, token expiration, input validation
- Privacy baseline: artist contact details remain hidden until contact action is triggered
- Browser support: latest two versions of Chrome, Firefox, Safari, and Edge

## Tech Stack

- NestJS 11
- TypeScript
- Bun (package manager and script runner)
- @nestjs/config
- @aws-sdk/client-s3
- @aws-sdk/s3-request-presigner
- class-validator + class-transformer
- Winston + winston-daily-rotate-file
- Jest (unit/e2e testing)
- Oxlint + Oxfmt (linting/formatting)

## Configuration

Environment variables are loaded from root env files in this order:

1. `.env.${NODE_ENV}.local`
2. `.env.${NODE_ENV}`
3. `.env.local`
4. `.env`

Use `.env.example` as the starting template.

The shared config module (`libs/config`) exposes namespaced config values via `registerAs`, so usage follows nested keys like:

```ts
this.config.get("database.port");
this.config.get("cache.host");
this.config.get("s3.bucket");
this.config.get("filesystem.driver");
this.config.get("app.port");
```

Validation is modularized per config domain in dedicated files:

- `libs/config/src/app.config.ts`
- `libs/config/src/database.config.ts`
- `libs/config/src/cache.config.ts`
- `libs/config/src/s3.config.ts`
- `libs/config/src/filesystem.config.ts`

### File Storage Configuration

Uploader backend selection is runtime-configurable through environment variables:

```env
FILESYSTEM_DRIVER=local
LOCAL_STORAGE_ROOT=uploads
```

- `FILESYSTEM_DRIVER` supports `local` or `s3`
- When `local` is selected, files are written under `LOCAL_STORAGE_ROOT`
- When `s3` is selected, existing `S3_*` config values are used

Only one storage strategy is instantiated at startup, based on `FILESYSTEM_DRIVER`.

### Shared Uploader Module

`libs/uploader` implements a strategy pattern behind `UploaderService`:

- Upload file content
- Download file as binary (`Buffer`)
- Generate download URL

Missing files raise a `NotFoundException` for both strategies.

## Getting Started

Install dependencies:

```bash
bun install
```

Run the applications:

```bash
# main app
bun run start

# main app (watch)
bun run start:dev

# main app (debug + watch)
bun run start:debug

# admin app
bun run start:admin

# admin app (watch)
bun run start:admin:dev

# admin app (debug + watch)
bun run start:admin:debug

# production mode (main build output)
bun run start:prod
```

## Scripts

```bash
# build
bun run build

# format apps and libs
bun run format

# lint apps and libs
bun run lint

# unit tests
bun run test

# test watch mode
bun run test:watch

# test coverage
bun run test:cov

# e2e tests
bun run test:e2e

# e2e tests (admin app)
bun run test:e2e:admin
```

## Documentation

- Requirements specification: `docs/requirements-and-specs.md`

## Status

Current requirements document status: Draft (v1.0, March 2026).

Implementation should align to requirement IDs and priority levels defined in the specification.
