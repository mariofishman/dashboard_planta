# `alertas_fake` experiment laboratory — redesign V2

**Version:** 2.0 draft  
**Status:** Stage 2 design specification; implementation has not started  
**Scope:** A02, A03, and A05 only  
**Interface:** `/dev/scenarios`  
**Predecessor:** [`alertas_fake_audit_and_redesign.md`](./alertas_fake_audit_and_redesign.md)  
**Current source:** development-only synthetic PostgreSQL tables  
**Required source boundary:** `alertas_fake` writes `test_database`; Monitor reads it through normal read-only polling

## 1. Purpose

V2 replaces the fixed, single-record scenario cards with an accelerated factory experiment. A tester must be able to create several source records at different simulated times, watch Monitor poll them, and see each record move through its business and incident history.

The interface must answer, without requiring code knowledge:

1. What source records currently exist?
2. What simulated time is it?
3. When will Monitor poll again?
4. What did the latest complete poll read?
5. Which records are approaching or exceeding their threshold?
6. Which Monitor incidents exist, and why?
7. Did Dashboard, routing, and conversations receive the expected result exactly once?
8. What happened earlier in this experiment?

The required path remains:

`tester changes test_database through alertas_fake → time advances → Monitor polls read-only → Monitor evaluates → incidents and downstream results update → reports and Dashboard read Monitor history`

## 2. Non-negotiable boundaries

- `soft_database` is EmusaSoft's operational database and is never written by this laboratory.
- `backup_database` is immutable and is never written.
- `test_database` is disposable MySQL reconstructed from `backup_database`.
- `alertas_fake` may write only source records in `test_database`.
- Monitor reads `test_database` with separate read-only credentials.
- Monitor-owned projections, observations, incidents, evidence, routing, conversations, messages, administrative closures, and experiment snapshots live in the independent PostgreSQL Monitor database.
- Source actions never create, resolve, reopen, or administratively close Monitor incidents directly.
- Only a complete successful poll may reconcile source state with Monitor state.
- Failed, incomplete, invalid, or stale reads preserve the last trustworthy Monitor state.
- The synthetic `monitor_sim_*` boundary remains until V2 passes equivalent scenarios through `test_database`.

## 3. Why V2 replaces the current interface

The current page prepares one fixed source record for each rule and presents five dense technical columns. It is useful for automated integration checks but difficult for a business tester to understand. It also prevents realistic concurrency: the factory may have many material movements, active work orders, and declared reels at the same time.

V2 changes the model from **select one canned case** to **operate a small accelerated factory timeline**.

V2 also removes the following incorrect A02 assumptions discovered during Stage 2 review:

- material awaiting warehouse dispatch belongs to A01, not A02;
- A02 cannot know that an item physically arrived without a digital receipt;
- A02 must not invent a physical-arrival state or route from it;
- the destination is known even while the current physical position is unknown; and
- elapsed A02 time is measured from recorded warehouse dispatch, not from Monitor's last poll.

## 4. Shared experiment model

### 4.1 Experiment identity

Every new experiment receives a unique `experiment_id`. Source records created by the laboratory carry an experiment-safe identity or namespace so a new experiment does not require deleting historical Monitor incidents.

Starting a new experiment:

- creates a new experiment identity;
- sets the chosen simulated start time;
- starts with no laboratory-created source records;
- preserves all earlier Monitor history; and
- does not run a poll until the tester starts the clock.

A safeguarded rebuild of `test_database` is an administrative command outside this UI. It is not the ordinary experiment reset.

### 4.2 Accelerated clock

The experiment has one shared simulated factory clock so A02, A03, and A05 records can interact on the same timeline.

Controls:

- `Inicio del experimento`: editable date and time before the experiment starts.
- `Hora simulada actual`: read-only current simulated date and time.
- `Segundos reales por minuto simulado`: integer from `1` through `60`.
- `Frecuencia de sondeo`: editable positive integer measured in simulated minutes.
- `Iniciar`: starts the clock and automatic polling schedule.
- `Pausar`: stops the clock and automatic polls.
- `+1`, `+5`, `+10`, `+15`, `+20`, `+29`, `+30`, `+31 min`: add that many simulated minutes.

Clock semantics:

- At speed `1`, one real second advances one simulated minute.
- At speed `2`, two real seconds advance one simulated minute.
- At speed `60`, sixty real seconds advance one simulated minute.
- A polling frequency of `3` means one poll every three simulated minutes. At speed `2`, that is every six real seconds.
- Speed and polling frequency are independent values.
- Speed and frequency may be edited while paused. On resume, the next automatic poll is scheduled at `current simulated time + polling frequency`.
- While paused, the manual time buttons are disabled. The tester may inspect the experiment, capture a snapshot, or perform a source action without advancing time.
- While running, a manual jump replays every scheduled poll time crossed by the jump in chronological order. With a frequency of `3`, a jump from minute `0` to minute `29` polls at minutes `3`, `6`, `9`, `12`, `15`, `18`, `21`, `24`, and `27`.
- `Pausar` freezes simulated time and automatic polling. Source actions and snapshot capture remain available while paused.
- Dispatch, OT start, consumption, declaration, weighing, movement, and reception actions use the current simulated time.
- Poll execution is serialized. If a source action occurs while a poll is already reading, that poll finishes against its original source revision and the UI keeps the newer action marked `Cambio pendiente de sondeo` for the next complete poll.

### 4.3 Polling controls

- `Próximo sondeo`: shows the exact simulated time remaining until the next automatic poll.
- `Último sondeo completo`: shows time, duration, row counts, and outcome in plain Spanish.
- The tester cannot invoke an out-of-schedule poll from the normal experiment controls. Polls occur only when the running clock reaches a configured polling time, including the intermediate polling times crossed by a manual time jump.
- Repeated polls of unchanged source state must not create duplicate evidence, incidents, deliveries, conversation links, alert messages, or Dashboard cards.

### 4.4 Run, pause, and snapshot

`Capturar estado` creates an immutable development snapshot containing:

- experiment ID and simulated time;
- speed, polling frequency, run/pause state, and next poll time;
- source records relevant to A02, A03, and A05;
- latest trustworthy Monitor projections and observations;
- latest poll cycle and any pending test fault;
- expected and actual incidents;
- routing-delivery, conversation-link, and alert-message counts; and
- a snapshot ID visible in the UI.

The snapshot is structured evidence, not merely an image. A browser screenshot or annotation can reference its snapshot ID.

### 4.5 Reset behavior

`Nuevo experimento` requires confirmation and creates a new experiment identity. It does not delete or rewrite Monitor history. A source-only correction or receipt is never labeled reset.

## 5. Database and reporting design

V2 must not physically move duplicated rows between active and history tables. It uses normalized current-state tables, append-only observations, existing incident history, and reporting views.

### 5.1 A02 movement identity

Every A02-tracked row represents one EmusaSoft movement, not one product category and not necessarily one uniquely coded item.

Required identity and descriptive fields:

- `source_movement_id`: stable EmusaSoft movement identity and Monitor natural key component;
- `sku`: required for every material;
- `unique_item_code`: optional; present for individually identified items such as reels;
- description snapshot;
- quantity and unit;
- origin warehouse or location;
- intended destination, machine, and OT when applicable;
- dispatch time;
- latest trustworthy source state;
- receipt or cancellation time when present; and
- experiment ID for development-created records.

### 5.2 Typed Monitor projections and observations

Use rule-specific typed tables rather than one generic entity-attribute-value table:

- A02 movement projection: latest trustworthy state for each movement.
- A02 movement observation: append-only meaningful state changes tied to a complete poll cycle.
- A03 work-order projection and observation: latest active/consumption state and meaningful history.
- A05 reel projection and observation: latest declaration, weighing, movement, and reel-kind state and meaningful history.

Every table requires a primary key, timestamps, required-field constraints, explicit foreign keys, and indexes for condition identity and report filters. Physical names and source-column mappings are finalized only after the Stage 3 `test_database` handoff audit.

### 5.3 Incident and administrative-closure history

Keep the existing incident, evidence, and transition records separate from operational source history. Add a normalized one-to-one administrative-closure record for a closed incident occurrence containing:

- standardized reason;
- mandatory comment;
- administrator identity;
- closure timestamp;
- frozen evidence reference; and
- optional shared cascade reference for correlated incidents.

A view cannot replace this table because a view does not own the required closure record. Reporting views may join closure details to movement, OT, or reel history.

### 5.4 Views used by the UI and reports

- A02 active view: latest trustworthy movement state is `TRANSITO`.
- A02 complete history view: every observed movement, including active, received on time, received late, cancelled, or still unresolved.
- A02 incident-report view: movement history joined to zero or more incident occurrences and administrative closure.
- Equivalent current-state, complete-history, and incident-report views for A03 and A05.

The operational-history view answers what happened to every source record. The incident-report view answers which records generated alerts and how those alerts ended. The Dashboard continues to use incident history for alerts; ordinary on-time movements do not become incidents or incident cards.

### 5.5 Reconciliation after polling

- A complete poll may insert a new projection, update its latest trustworthy state, and append a meaningful observation.
- An unchanged complete poll updates poll freshness but does not append duplicate business evidence.
- A source record disappearing from a filtered result is not automatically treated as received unless the adapter's complete-result contract proves that interpretation or a follow-up read confirms its final state.
- Failed, partial, invalid, stale, or unknown-freshness polls cannot move a projection to completed history or resolve an incident.

## 6. UI blueprint

This section is the implementation blueprint for the `/dev/scenarios` HTML/React interface.

### 6.1 Page hierarchy

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Laboratorio alertas_fake                 Experimento EXP-…           │
│ [Inicio] [Hora actual] [Velocidad] [Frecuencia] [Iniciar/Pausar]    │
│ [+1] [+5] [+10] [+15] [+20] [+29] [+30] [+31]                    │
│ Próximo sondeo …  Último sondeo …  [Capturar estado] [Nuevo exper.] │
├──────────────────────────────────────────────────────────────────────┤
│ [A02 Movimientos] [A03 Consumo OT] [A05 Bobinas] [Integridad]       │
├──────────────────────────────────────────────────────────────────────┤
│ [Ver historial] Acción principal del alert seleccionado              │
│ Tabla operativa actual                                               │
│ Incidentes Monitor y resultado esperado frente a resultado real      │
└──────────────────────────────────────────────────────────────────────┘
```

The experiment controls remain visible while switching alert tabs. Each alert tab uses its own correctly named entities and actions. Only the current operational table remains inline. `Ver historial`, immediately to the left of the source-creation action, opens the alert's complete history in a wide dialog. This applies consistently to A02, A03, and A05.

### 6.2 Shared header controls

Exact labels:

- `Inicio del experimento`
- `Hora simulada actual`
- `Segundos reales por minuto simulado`
- `Frecuencia de sondeo (minutos simulados)`
- `Iniciar` / `Pausar`
- `Próximo sondeo`
- `Último sondeo completo`
- `Capturar estado`
- `Nuevo experimento`

The header always states the conversion, for example: `2 segundos reales = 1 minuto simulado · sondeo cada 3 minutos simulados = 6 segundos reales`.

Every laboratory dialog treats a click on the surrounding backdrop exactly like `Cancelar`: it closes without saving or changing source or Monitor state. Clicking inside the dialog does not dismiss it.

### 6.3 A02 tab — Movimientos de material

Primary action: split button `Despachar material`.

- Selecting the main button area immediately creates and dispatches one complete synthetic movement at the current simulated time. The laboratory rotates through realistic mock materials, always includes an SKU, and includes a unique item code only when that material type supports one. No form or confirmation interrupts the running experiment.
- Selecting the narrow dropdown area at the far right opens the dispatch form already filled with the same proposed mock data. The tester may change any value before accepting it.
- Accepting the editable form dispatches the edited movement at the then-current simulated time.
- The two paths use the same source-write function and produce the same pending-poll state.

The dispatch dialog requires:

- SKU;
- optional unique item code;
- description;
- quantity and unit;
- origin;
- intended destination;
- OT and machine when applicable; and
- dispatch confirmation at the current simulated time.

#### Active movements table

One row per latest trustworthy movement still in `TRANSITO`.

Columns:

- Movimiento;
- SKU;
- Código único, or `No aplica`;
- Material;
- Cantidad;
- Origen;
- Destino previsto;
- Hora de despacho;
- Tiempo desde despacho;
- Estado EmusaSoft;
- Próximo umbral;
- Último sondeo;
- Estado A02;
- Acciones.

Row actions:

- `Registrar recepción`;
- `Cancelar/corregir movimiento`, when the source model supports it;
- `Ver observaciones`;
- `Ver incidente`, when an incident exists.

There is no physical-arrival field. `Registrar recepción` changes only the selected source movement. The row leaves the active view only after a complete poll confirms its final state.

#### Complete movement history

`Ver historial` opens this information in a wide dialog instead of placing a second large table under the active movements. The history includes active and completed movements. Filters include experiment, time, SKU, optional unique code, destination, source state, on-time/late outcome, and incident outcome.

Additional columns:

- receipt/cancellation time;
- total transit duration;
- `Recibido a tiempo`, `Recibido tarde`, `Cancelado`, or `Aún en tránsito`;
- A02 occurrence count; and
- incident terminal state.

### 6.4 A03 tab — OTs activas sin primer consumo

Primary action: `Iniciar OT`.

The start dialog requires OT, operation, machine, and start confirmation at the current simulated time.

Current table columns:

- OT;
- operación;
- máquina;
- hora de inicio;
- tiempo activa;
- consumos válidos;
- primer consumo;
- entrada de OT editable o bloqueada;
- evidencia A07 superior;
- último sondeo;
- estado A03;
- acciones.

Row actions:

- `Registrar primer consumo`;
- `Aplicar evidencia A07`, available only in advanced testing and never fabricating consumption;
- `Ver observaciones`;
- `Ver incidente`.

`Ver historial` opens the complete OT history in the same wide-dialog pattern used by A02. History outcomes include first consumption on time, first consumption late, suppressed by stronger A07, resolved, open, and closed without resolution.

If OT input remains editable, the source correction is a real valid consumption. If input is locked and the missing history cannot be reconstructed safely, V2 must preserve the evidence and use authorized administrative closure rather than invent consumption.

### 6.5 A05 tab — Bobinas producidas o remanentes

Primary action: `Declarar bobina`.

The declaration dialog requires:

- unique reel code;
- SKU;
- produced or remnant kind;
- source OT;
- machine;
- declaration time; and
- required destination or next OT when known.

Current table columns:

- código único;
- SKU;
- tipo;
- OT;
- máquina;
- hora de declaración;
- tiempo desde declaración;
- pesada;
- salida de máquina;
- razones A05 actuales;
- último sondeo;
- estado A05;
- acciones.

Row actions:

- `Registrar pesaje`;
- `Registrar salida de máquina`;
- `Ver observaciones`;
- `Ver incidente`.

`Ver historial` opens the complete bobina history in the same wide-dialog pattern used by A02 and A03.

The UI must show `Sin pesar` and `Sigue en máquina` independently. Completing only one action leaves the other reason active. Starting a destination-bound movement creates the appropriate source movement; an unreceived movement later belongs to A02 and must not remain as a duplicate A05 movement reason.

### 6.6 Incident panel

The selected source row opens a subordinate incident panel showing:

- expected result after the next complete poll, in plain language;
- actual latest incident occurrence;
- open, resolved, or closed-without-resolution state;
- opening and terminal timestamps;
- reasons and frozen evidence;
- recipients and delivery status;
- linked conversation and Monitor alert card; and
- visible mismatch when expected and actual do not agree;
- latest committed change cursor; and
- real source-action-to-detection delay, explicitly separated from simulated business time.

`Ver incidente` is a reversible row control. It opens the subordinate panel for that row, changes its label to `Ocultar incidente`, and closes the panel when selected again. The row action controls remain vertically centered with the operational data in the same table row.

`Cerrar sin resolución` appears only for an open incident and an authorized administrator. It opens a confirmation dialog requiring reason and comment and shows correlated incidents before confirmation. It never changes the EmusaSoft source state. If the source still reports the condition, the operational row remains visible with the incident badge `Cerrada sin resolución` and Monitor suppresses reopening until a complete healthy poll proves the source condition cleared.

#### Routing expectations

- A02 notifies both ends of the recorded transfer: the warehouse dispatcher or sender and the machine operator, plus the applicable supervisors. V2 must not select a primary owner from an unobservable physical-arrival state. The corrected primary-owner rule must be approved in the alert catalog before implementation.
- A03 routes to the factory manager, operation shift supervisor, technical leader, and machine operator.
- A05 keeps the process operator as primary. Produced reels also notify the process supervisor. Remnant reels additionally notify the raw-material warehouse dispatcher or sender and its supervisor or leader.
- Routing remains deterministic from versioned rule evidence and the Operational Responsibility Roster. An LLM never chooses recipients.

### 6.7 Integrity tab

The main workflow does not expose four technical failure types. The `Integridad` tab provides:

- one user-facing action: `Hacer fallar el próximo sondeo`;
- an explanation that trustworthy Monitor state must remain unchanged;
- before/after projection and incident counts; and
- snapshot capture;
- downstream counts for evidence, routing deliveries, conversation links, alert messages, and visible cards; and
- a recovery check proving that a later successful poll completes missing routing or conversation work without duplicating the committed incident.

Automated tests separately exercise timeout, source error, partial results, invalid shape, stale data, unknown freshness, duplicate keys, and revision changes. Manual UI testing verifies the understandable business guarantee, not every transport failure variant.

### 6.8 Loading, empty, running, paused, and error states

- Loading: table skeletons and `Leyendo estado del experimento…`.
- Empty A02: `No hay movimientos despachados en este experimento.`
- Empty A03: `No hay OTs iniciadas en este experimento.`
- Empty A05: `No hay bobinas declaradas en este experimento.`
- Running: visible `En ejecución`, ticking simulated time, and next-poll countdown.
- Paused: visible `Pausado`; row actions and snapshot capture remain enabled, while time-jump buttons remain disabled.
- Polling: `Sondeando…`; prevent overlapping polls.
- Failed poll: state-preservation message; do not clear tables.
- Source action pending poll: badge `Cambio pendiente de sondeo`.
- Expected and actual mismatch: name the business difference; never show only a technical code.

### 6.9 Responsive behavior

- Desktop: shared controls in a compact toolbar; tables use sticky headers and horizontal containment inside the table region only.
- Tablet: controls wrap into two rows; alert tabs remain visible; secondary columns may move into expandable row details.
- Mobile: experiment controls become a stacked summary with a single `Controles` drawer; each table row becomes a business summary card with actions; incident detail opens below or in a full-height dialog.
- No page-level horizontal overflow at 390, 768, or 1440 pixels.
- Dynamic times and counters use tabular numerals.

## 7. Business scenario matrices

### 7.1 Shared scenarios

| Scenario | Tester action | Required result |
| --- | --- | --- |
| New experiment | Choose start, speed, and frequency | Empty source tables, preserved prior Monitor history, no automatic poll before start |
| Run and pause | Start, allow ticks, then pause | Time and automatic polls stop at a visible deterministic point |
| Manual time jump | While running, add any supported amount | Every active record ages by the same added simulated time and every scheduled poll crossed by the jump runs in chronological order |
| Automatic poll | Let next poll become due | Same normal poller path runs once without overlap |
| Source action between polls | Create or correct a record | Source row changes and shows `Cambio pendiente de sondeo`; Monitor remains unchanged until polling |
| Repeated unchanged polls | Poll several times | No duplicate evidence, incidents, deliveries, conversations, messages, or cards |
| Failed next poll | Use integrity control | Last trustworthy projections and incidents remain unchanged |
| Snapshot | Pause and capture | Immutable snapshot ID reproduces the visible state |
| New experiment after history | Start another experiment | Earlier observations and incidents remain queryable |

### 7.2 A02 scenarios

| Scenario | Source timeline | Required result |
| --- | --- | --- |
| Several concurrent movements | Dispatch multiple SKUs and optional uniquely coded items minutes apart | One independently tracked row per movement |
| Before threshold | Movement remains `TRANSITO` below 30 minutes | No A02 incident |
| At threshold | Movement reaches the approved comparator boundary | Result matches the versioned A02 contract |
| After threshold | Complete poll sees movement overdue in `TRANSITO` | Exactly one A02 occurrence |
| Mixed population | Some movements received on time, one late, others still moving | Each row receives its own correct outcome |
| Receipt before poll | Receive a movement after threshold but before Monitor polls | Result follows source truth at the complete poll; no invented historical incident unless the contract explicitly supports retrospective detection |
| Receipt after incident | Receive selected overdue movement, then poll | Its incident resolves; unrelated movements remain unchanged |
| Cancellation/correction | Correct or cancel selected movement | Only its projection and incident reconcile |
| Administrative closure | Close an open A02 without source correction | Source row remains based on source state; incident closes and reopening is suppressed correctly |
| Recurrence | Condition clears, then a later qualifying condition with the same natural key occurs | New occurrence; earlier history preserved |

### 7.3 A03 scenarios

| Scenario | Source timeline | Required result |
| --- | --- | --- |
| Several concurrent OTs | Start OTs minutes apart | One independently tracked row per OT |
| First consumption before 15 | Register valid consumption before threshold | No A03 incident |
| Exactly 15 and after | Leave selected OT without consumption | Contract comparator determines opening; one occurrence only |
| Mixed population | Some OTs consume, one remains empty, another gains A07 evidence | Each OT reconciles independently |
| Consumption after incident | Register first valid consumption, then poll | Selected A03 resolves |
| Stronger A07 | Apply proven stronger evidence | A03 suppresses or resolves without inventing consumption |
| Failed read after correction | Correct source, fail poll | Existing Monitor state remains until later complete poll |
| Administrative closure and recurrence | Close unreconstructable history, later prove clear, later recur | Suppression and next occurrence behave correctly |

### 7.4 A05 scenarios

| Scenario | Source timeline | Required result |
| --- | --- | --- |
| Several declared reels | Declare produced and remnant reels minutes apart | One row and at most one open A05 occurrence per reel |
| Weighed and moved on time | Complete both before threshold | No A05 incident |
| Not weighed only | Movement complete, weighing missing at threshold | One incident with `not_weighed` only |
| Still at machine only | Weighed, required movement missing at threshold | One incident with `still_at_machine` only |
| Both reasons | Neither action complete at threshold | One incident containing both reasons |
| Partial correction in either order | Weigh first or move first | Same occurrence remains with only the remaining reason |
| Produced versus remnant | Exercise both kinds | Correct deterministic routing without duplicate incident |
| A02 handoff | Movement begins; receipt remains missing past A02 threshold | A02 owns transit non-receipt; no duplicate A05 movement reason |
| Administrative closure | Reel cannot be traced | A05 closes without inventing scale or movement records |
| Recurrence | Resolved source later becomes a new qualifying occurrence | New occurrence with earlier history preserved |

## 8. Edge-case coverage and priorities

### Test now

- concurrent records with staggered start times;
- speed values `1`, `2`, `3`, and `60`;
- polling frequency lower than, equal to, and greater than remaining threshold time;
- running time jump crossing one or several polling times and records' thresholds;
- source action at the same simulated instant as an automatic poll;
- pause immediately before a poll becomes due;
- changing speed or frequency while paused;
- repeated no-op polls;
- correction followed by failed or incomplete poll;
- one row corrected while another remains overdue;
- new experiment with earlier history preserved;
- administrative closure while source condition persists;
- source clears after administrative closure, followed by true recurrence;
- duplicate prevention across incident, evidence, routing, conversation, message, and card;
- snapshot captured while paused and after a failed poll; and
- A05 partial reasons combined with A02 handoff.

### Automated only unless debugging requires UI exposure

- invalid result shape;
- partial pagination;
- duplicate natural keys across pages;
- source revision changes during pagination;
- stale and unknown freshness;
- adapter timeout and transport-specific source errors; and
- overlapping poll lock behavior.

### Later integration evidence

- production Aurora performance and indexing;
- failover and managed credential rotation;
- real EmusaSoft authentication and permissions;
- production-scale load and retention sizing; and
- deployment observability.

## 9. Acceptance requirements

V2 is accepted only when:

1. A business tester can operate each alert without reading code.
2. A02 supports multiple material movements with mandatory SKU and optional unique item code.
3. A03 supports multiple independently timed active OTs.
4. A05 supports multiple produced/remnant reels and both OR reasons independently.
5. Accelerated clock speed is an integer from 1 through 60 real seconds per simulated minute.
6. Polling frequency is independently editable in simulated minutes.
7. Run, pause, running-only time jumps, scheduled automatic polls, snapshot, and new experiment behave deterministically.
8. Source actions modify only source data; administrative closure modifies only Monitor incident state through an authorized audited endpoint.
9. Complete history contains active and completed operational records; incident history remains normalized and reportable separately.
10. Failed or incomplete reads preserve the last trustworthy state.
11. Repeated successful polls create no duplicate downstream objects.
12. A later successful poll repairs incomplete routing or conversation work without duplicating the incident or any completed downstream object.
13. Recurrence occurs only after a prior occurrence reached a terminal state and a complete healthy cycle ended any suppression.
14. Expected and actual results are compared in plain business language.
15. Dashboard and conversation results are verified for A02, A03, and A05.
16. Simulated business time, real audit time, detection delay, and committed change cursor remain distinguishable.
17. The same scenarios pass through `test_database` and the normal read-only adapter before synthetic tables are removed.
18. Responsive and console validation passes at mobile, tablet, and desktop widths.

## 10. V1-to-V2 coverage audit

This section criticizes V2 against the preserved original document.

| V1 requirement or finding | V2 result | Critique outcome |
| --- | --- | --- |
| Source, clock, poller, expected, and actual state must be distinguishable | Preserved through shared controls, operational tables, poll summary, and incident panel | V2 must not hide expected-versus-actual comparison inside technical details |
| Clean, before, at, after, persistence, correction, resolution, failed reads, recurrence, and reset | Preserved and expanded for concurrent records | `Nuevo experimento` replaces destructive history reset |
| A05 reasons are independent OR conditions | Preserved explicitly | Partial corrections must work in either order |
| A03 stronger-A07 suppression | Preserved as an advanced source-evidence action | Implementation must use real evidence mapping, not a fabricated boolean in the final adapter |
| A02 physical-arrival routing variants | Rejected | V2 follows the Stage 2 decision that physical arrival is unknowable without receipt; alert catalog and routing authority require correction |
| Independent clocks per alert | Intentionally replaced by one shared experiment clock | Shared time is necessary for interacting factory records; rule state and revisions remain independent even though time is shared |
| Failed-read variants visible in the old UI | Simplified to one understandable integrity action | All technical variants remain mandatory automated tests |
| Exact downstream counts and `Coincide` strictness | Preserved in incident details and acceptance tests | Main UI should translate mismatches into business language |
| No direct Monitor mutation from source actions | Preserved | Administrative closure is the only explicit Monitor action and requires separate authorization and audit |
| Dashboard and conversation integration | Preserved | Ordinary on-time operational history must not create incident cards |
| `test_database` replacement boundary | Preserved | Synthetic source tables remain until replacement acceptance |
| A02/A03/A05 fixed single records | Replaced | Concurrency is a core V2 acceptance requirement |
| Simulated and real timestamps remain separate | Preserved | UI shows simulated business time; audit records retain real server timestamps without confusing the tester |
| Duplicate and recurrence protections | Preserved | Must be proven with simultaneous records, not only one natural key |
| Previous browser and automated evidence | Historical only | V1 validation does not validate V2; V2 requires a new complete test and browser evidence set |

### Blind-spot attack

The most likely V2 implementation mistakes are:

- treating SKU as a unique physical-item identity;
- moving or duplicating rows between active and history tables instead of using views;
- allowing a failed filtered query to imply receipt;
- mixing source status with incident lifecycle in one column;
- letting accelerated real-time callbacks produce overlapping polls;
- letting a large time jump skip required intermediate polls without making that behavior visible;
- resetting Monitor history to obtain a clean experiment;
- exposing technical failure codes as the primary business workflow;
- creating A05 and A02 incidents for the same unreceived movement; and
- implementing one generic untyped table for A02, A03, and A05.

### Authority corrections required before implementation

- Remove A02 pending-dispatch and invented physical-arrival cases from the catalog, routing rules, contracts, fixtures, and tests.
- Define A02 from the recorded destination-bound movement, `TRANSITO` state, missing receipt, and time since dispatch.
- Record one exact A02 threshold comparator in the catalog and executable contract. V2 must still test immediately before, exactly at, and immediately after the boundary; the tester must not be asked to decide an operationally immaterial one-second convention.
- Reconcile A05's catalog presentation `Por vencer → Error` with implementation. Either specify a real pre-threshold `Por vencer` window and show it in the V2 table, or remove the unsupported presentation promise. Do not invent the window during implementation.
- Preserve A03's exact 15-minute comparator and define real input-lock and stronger-A07 evidence mappings in the versioned source contract.

## 11. Implementation sequence

1. Finish Stage 2 business review for A02, A03, and A05 and approve this V2 blueprint.
2. Correct conflicting alert-catalog and routing authority, especially A02 physical-arrival claims.
3. Complete Stage 3 `test_database` readiness inspection and source-field mapping.
4. Write versioned source contracts and typed projection/observation migrations.
5. Implement the shared experiment clock, scheduler, snapshots, and new-experiment identity.
6. Implement the A02 tab and multi-movement source actions.
7. Implement the A03 tab and multi-OT source actions.
8. Implement the A05 tab and multi-reel source actions, including A02 handoff.
9. Implement incident detail and authorized administrative closure.
10. Implement the integrity tab and automated failure matrix.
11. Validate through synthetic sources, then through `test_database` read-only polling.
12. Remove the old synthetic scenario boundary only after equivalent acceptance passes.

## 12. Current proof boundary

This document is a blueprint, not implementation evidence. The existing V1 code and tests do not prove V2. No V2 schema, adapter, API, scheduler, UI, snapshot, or acceptance test has been implemented yet.

The original document remains the preserved record of the V1 audit, implementation, validation, and Stage 2 discoveries.
