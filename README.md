# Makeup Artist Booking Platform - Backend

Backend service for a location-based makeup artist booking platform that connects clients with nearby artists, supports booking workflows, and implements a points-driven visibility model.

This repository is built with NestJS + TypeScript and managed with Bun.

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
- Jest (unit/e2e testing)
- Oxlint + Oxfmt (linting/formatting)

## Getting Started

Install dependencies:

```bash
bun install
```

Run the application:

```bash
# development
bun run start

# watch mode
bun run start:dev

# debug watch mode
bun run start:debug

# production mode (build output)
bun run start:prod
```

## Scripts

```bash
# build
bun run build

# format source and tests
bun run format

# lint source and tests
bun run lint

# unit tests
bun run test

# test watch mode
bun run test:watch

# test coverage
bun run test:cov

# e2e tests
bun run test:e2e
```

## Documentation

- Requirements specification: `docs/requirements-and-specs.md`

## Status

Current requirements document status: Draft (v1.0, March 2026).

Implementation should align to requirement IDs and priority levels defined in the specification.
