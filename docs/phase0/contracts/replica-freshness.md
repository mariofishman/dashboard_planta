# Replica freshness contract 1.0.0

Replica lag is not required for the immutable local backup. Local query validation records the backup revision and treats the source as a fixed snapshot.

Production and staging require a freshness provider before a cycle may resolve an incident. ES-02 must supply one of:

1. permitted read access to `information_schema.replica_host_status`;
2. CloudWatch `AuroraReplicaLag`; or
3. another versioned, testable EmusaSoft signal.

The provider returns `observedAt`, `lagMilliseconds`, `status`, and `providerVersion`. A cycle can resolve only when the signal is available, no older than 60 seconds, and within the EmusaSoft-approved threshold. The provisional threshold is 60 seconds solely for contract tests; it is not a production approval.

Unknown, stale, excessive, malformed, or unavailable freshness always preserves current incidents and emits `source.freshness.changed`.
