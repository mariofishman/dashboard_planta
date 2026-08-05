# Phase 6 Stage 4 — Connected `test_database` handoff

**Status:** Complete locally — 2026-07-31

**Scope:** Separate-source writes, read-only polling, scheduler connection, and Monitor incident lifecycle for A02, A03, and A05 behind the older `/dev/scenarios` screen composition. This is not connected V2 interface acceptance, Stage 5 downstream acceptance, or Phase 10 production evidence.

## Implemented boundary

- `alertas_fake` uses the `alertas_fake` account and changes only approved source records in `test_database`.
- Monitor uses the separate `monitor_source_ro` account and versioned, keyset-paginated A02/A03/A05 queries.
- Both consumers require the readiness marker and refuse an active reset lock before connecting or polling.
- Development `/dev/scenarios` uses this boundary by default through the older screen composition; Stage 4 did not port or accept the approved tabbed V2 laboratory. Tests retain the deterministic in-memory simulator.
- The laboratory reuses the versioned, backup-verified A02/A03/A05 identities in `config/detection/fixtures/test-database-stage4.v1.json`; it does not consume new source candidates over repeated runs.
- The normal scheduler and the development “poll now” action invoke the same runner. Scenario actions never write incidents, routing, conversations, or messages directly.

## A03 decision

A03 triggers when an active, nondeleted OT has been open for at least 15 minutes and no nondeleted `orden_trabajo_materiales` row has `cantidad_consumida > 0`. Any positive consumption prevents the alert. Zero, null, absent, or deleted consumption does not. A03 is independent of A07.

## Evidence

- Query plans: A02 1,249 keys, A03 7 keys, A05 838 keys; indexed access and no full-table scan.
- Connected lifecycle validation: each rule opened exactly one incident, an unchanged successful poll added no duplicate evidence, and a corrected source condition resolved the incident.
- Isolation validation: prepare and correction actions did not change Monitor-owned table counts.
- Safety validation: database health passed and an active reset lock was refused.
- Repository validation: typecheck, automated tests, build, and desktop/mobile browser checks passed.

## Second-pass criticism and corrections

The first implementation passed its lifecycle check but was not strict enough in five places:

1. The Monitor adapter executed the read-only SQL and then merged evaluation fields read through the writer account. That weakened the proof boundary. The adapter now derives lifecycle evidence only from rows returned by `monitor_source_ro`; the writer account remains confined to laboratory status and source actions.
2. Multi-statement A03/A05 preparation and correction were not atomic. Source mutations and initial three-rule setup now use MySQL transactions, and recurrence restores its in-memory clock if its source transaction fails.
3. Early application starts selected a new qualifying row and therefore drifted through source candidates. The database was rebuilt from the protected backup, and fixture identities are now explicit, versioned, validated, and reused.
4. A scheduled transport failure could be consumed by the first retry and allow the same poll to succeed. Transport failures now cover the complete bounded retry cycle. Connected validation proves source error, partial data, invalid schema, and timeout preserve the open A03 incident and its evidence.
5. Runtime query settings duplicated the versioned contracts in code. The Stage 4 registry now loads query identity, version, pagination, limits, timeout, and interval from the A02/A03/A05 contract documents and fails closed when their natural keys do not match.

Run the durable connected check with:

```sh
npm run validate:phase6-stage4
```

## Remaining boundaries

- Recovery must connect the approved V2 workflow to these existing services and replace the earlier Step 8.2–8.7 browser evidence, which remains diagnostic and invalid for acceptance.
- Stage 5 must validate routing, deliveries, Dashboard cards, conversations, messages, Chat UI, recurrence, technical failure preservation, concurrency, and recovery as one connected system.
- The test source uses a controlled laboratory clock and a fixed local freshness provider; live replica freshness and lag semantics remain Phase 10 evidence.
- Keep `monitor_sim_*` and the simulator adapter until Stage 5 replacement acceptance passes.
- Aurora compatibility, replica behavior, production authorization, production query plans, load, pilot, and deployment remain Phase 10.
