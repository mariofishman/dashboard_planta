# ADR 0003: Monitor TypeScript technical kit

**Status:** accepted  
**Date:** 2026-07-20

## Decision

Use one TypeScript codebase with these concrete components:

| Concern | Selection |
|---|---|
| Web | React, Vite, Material UI, Monitor design tokens |
| API | Node.js LTS, Fastify, REST/JSON, TypeBox JSON schemas |
| Monitor relational database | PostgreSQL 17 |
| ORM and migrations | Drizzle ORM and Drizzle Kit |
| EmusaSoft read adapter | `mysql2` prepared statements; no ORM and no ad-hoc runtime SQL |
| Detection scheduler/query runner | `croner`, PostgreSQL advisory locks, and `p-limit` bounded concurrency |
| WebSockets | Socket.IO with cursor-bearing domain events |
| Redis | `ioredis` and `@socket.io/redis-adapter`; ephemeral fan-out/presence only |
| Tests | Vitest, Fastify injection, Socket.IO client tests, Testcontainers where Docker is available, and Playwright for UI phases |
| Deployment | OCI containers; target AWS ECS Fargate, Aurora PostgreSQL, ElastiCache Redis, and an Application Load Balancer |

## Plain-language reason

This is a conventional TypeScript stack with mature libraries. PostgreSQL keeps Monitor data independent from EmusaSoft. Direct prepared MySQL reads make the forbidden write boundary easy to review. The scheduler avoids introducing a queue or broker. REST provides a simple recovery path when a client misses WebSocket messages.

No cloud resource is created by this ADR. The container remains portable. Production AWS spend and account ownership require business approval before provisioning.
