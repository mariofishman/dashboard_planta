# Polling and database-load limits 1.0.0

## Initial safe configuration

| Query | Interval | Timeout | Result limit | Concurrent executions |
|---|---:|---:|---:|---:|
| A02 | 5 minutes | 3 seconds per page | 1,000/page; 10,000/cycle | 1 |
| A05 | 5 minutes | 3 seconds per page | 1,000/page; 10,000/cycle | 1 |

Global defaults: at most two EmusaSoft queries concurrently, one execution of the same query at a time, 10% random start jitter, no overlap, and exponential retry starting at 30 seconds with a 15-minute cap. Retries do not exceed the normal concurrency budget.

These intervals detect a 30-minute breach within at most about five additional minutes while keeping a deliberately small local starting load. Production intervals remain disabled until ES-01 and ES-02 approve staging plans and a load budget.

## Bounds and optimization

- The application supplies a fixed cutoff timestamp and limit; the database does not calculate a moving clock inside the predicate.
- Results use primary-key keyset pagination and are ordered by primary key for reproducibility.
- A full page continues from its last key. Reaching the 10,000-row cycle limit marks the cycle incomplete; it cannot resolve absent conditions.
- Proposed A02 index: `(estado, fecha_recepcion, fecha_eliminacion, id)`; the timestamp predicate remains a residual check so pages preserve primary-key order.
- Existing A05 keys cover the work-order joins and the scale table has a unique serial key. Propose a narrow serial pagination index `(fecha_eliminacion, id)` only if staging plans show it is needed; type, state, and cutoff remain residual predicates.
- Index creation belongs to EmusaSoft and requires ES-01 review; Monitor does not apply indexes to EmusaSoft.
