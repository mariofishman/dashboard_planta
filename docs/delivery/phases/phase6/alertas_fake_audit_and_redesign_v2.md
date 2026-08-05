# `alertas_fake` experiment laboratory — redesign V2

**Version:** 2.1 accepted Stage 2 specification

**Role:** Supporting laboratory specification and preserved audit record; current Stage 5 execution and evidence status lives in the [Stage 5 recovery and completion plan](./stage5_corrective_execution_plan.md), while [`README.md`](./README.md) remains the Phase 6 status index

**Scope:** A02, A03, and A05 only  

**Current review interface:** [`prototypes/current/alertas-fake-v2/index.html`](../../../../prototypes/current/alertas-fake-v2/index.html)

**Target application interface:** `/dev/scenarios`

**Historical predecessor:** archived [`alertas_fake_audit_and_redesign_v1.md`](../../../../archive/docs/implementation/alertas_fake_audit_and_redesign_v1.md), superseded by this document

**Current prototype source:** browser-local synthetic records

**Current connected application source:** `test_database` through the Stage 4 writer and Monitor read-only adapter, currently exposed behind the older `/dev/scenarios` screen composition

**Required V2 connection:** preserve that source boundary while replacing the older screen with this approved tabbed workflow; the standalone prototype itself remains browser-local

## 1. Purpose

V2 replaces the fixed, single-record scenario cards with an accelerated factory experiment. A tester must be able to create several source records at different simulated times, watch Monitor poll them, and see each record move through its business and incident history.

The interface must answer, without requiring code knowledge:

1. What source records currently exist?
2. What simulated time is it?
3. When will Monitor poll again?
4. What did the latest complete poll read?
5. Which records are below, at, or beyond their threshold?
6. Which Monitor incidents exist, and why?
7. Did Dashboard, routing, and conversations receive the expected result exactly once?
8. What happened earlier in this experiment?

The required connected path remains:

`tester changes test_database through alertas_fake → time advances → Monitor polls read-only → Monitor evaluates → incidents and downstream results update → reports and Dashboard read Monitor history`

The standalone HTML prototype demonstrates the approved business workflow and interface only. Stage 4 separately connected the source and Monitor services behind the older `/dev/scenarios` screen; Recovery 3 subsequently ported this V2 workflow onto those existing services, and Recovery 6 produced the passing replacement Step 8.2–8.7 evidence.

## Execution status

The [Stage 5 recovery and completion plan](./stage5_corrective_execution_plan.md) owns Stage 5 execution, evidence status, and the immediate next action. [`README.md`](./README.md) remains the Phase 6 status index and exit-gate summary. Stage 2 acceptance evidence remains in [`alertas_fake_v2_edge_case_test_report_v2.md`](./alertas_fake_v2_edge_case_test_report_v2.md). This document defines the accepted laboratory behavior and preserves the audit findings needed for implementation; it does not advance stage status.

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
- The fallback `monitor_sim_*` simulator remains separately available until connected V2 replacement acceptance proves that the operational development workflow no longer depends on it. It is not the current default connected source boundary.

## 3. Why V2 replaces the V1 interface

The V1 page prepared one fixed source record for each rule and presented five dense technical columns. It was useful for automated integration checks but difficult for a business tester to understand. It also prevented realistic concurrency: the factory may have many material movements, active work orders, and declared reels at the same time.

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
- `Hora simulada`: prominent read-only value beside the experiment ID rather than an input.
- `Velocidad (s/min)`: integer from `1` through `60`.
- `Sondeo (min)`: integer from `1` through `99`, measured in simulated minutes.
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

`Nuevo experimento` requires confirmation and creates a new experiment identity. It archives the current experiment inside the running laboratory so its movements, incidents, and snapshots remain queryable from history and integrity views. The standalone HTML prototype has no durable persistence, so its confirmation states plainly that reloading the page discards every browser-local experiment. The connected experiment services provide durable history, and Recovery 3 exposed the approved V2 history workflow without deleting or rewriting Monitor history. A source-only correction or receipt is never labeled reset.

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
│                         [Capturar estado] [Nuevo experimento]         │
│ Experimento EXP-…   Hora simulada …      [Estado] [Iniciar/Pausar]  │
│ [Inicio] [Velocidad] [Frecuencia] │       espacio reservado         │
│ Avanzar: [+1] [+5] [+10] [+15]                                     │
│          [+20] [+29] [+30] [+31]                                   │
│ Próximo sondeo …                  Último sondeo …                    │
├──────────────────────────────────────────────────────────────────────┤
│ [A02 Movimientos] [A03 Consumo OT] [A05 Bobinas] [Integridad]       │
├──────────────────────────────────────────────────────────────────────┤
│ [Ver historial] Acción principal del alert seleccionado              │
│ Tabla operativa actual                                               │
│ Incidentes Monitor y resultado esperado frente a resultado real      │
└──────────────────────────────────────────────────────────────────────┘
```

The experiment controls remain visible while switching alert tabs. `Capturar estado` and `Nuevo experimento` sit in the page-title header. The experiment header presents the experiment ID and current simulated time as status, not editable fields, and owns the `Iniciar`/`Pausar` action. On desktop, the compact setup fields share the same right alignment as the two-row time-jump controls; the remaining right side stays visibly reserved for a later control or summary. The setup row retains the editable start time because it makes timestamp scenarios reproducible, but only before the experiment starts or creates records. The eight time-jump controls always occupy a four-by-two grid. Each alert tab uses its own correctly named entities and actions. Only the current operational table remains inline. `Ver historial`, immediately to the left of the source-creation action, opens the alert's complete history in a wide dialog. This applies consistently to A02, A03, and A05.

### 6.2 Shared header controls

Exact labels:

- `Inicio del experimento`
- `Hora simulada`
- `Velocidad (s/min)`
- `Sondeo (min)`
- `Iniciar` / `Pausar`
- `Próximo sondeo`
- `Último`
- `Capturar estado`
- `Nuevo experimento`

The conversion sentence is omitted because the speed and polling-frequency fields already provide those inputs. The lower experiment strip is reserved for `Próximo sondeo` and `Último sondeo`.

Every laboratory dialog treats a click on the surrounding backdrop exactly like `Cancelar`: it closes without saving or changing source or Monitor state. Clicking inside the dialog does not dismiss it.

### 6.3 A02 tab — Movimientos de material

Primary action: split button `Despachar material`.

- Selecting the main button area immediately creates and dispatches one complete synthetic movement at the current simulated time. The laboratory rotates through realistic mock materials, always includes an SKU, and includes a unique item code only when that material type supports one. No form or confirmation interrupts the running experiment.
- Selecting the narrow dropdown area at the far right opens the dispatch form already filled with the same proposed mock data. The tester may change any value before accepting it.
- Accepting the editable form dispatches the edited movement at the then-current simulated time.
- The two paths use the same source-write function and produce the same pending-poll state.

The A02 laboratory also includes `Zona de influencia del usuario` with `Solo origen`, `Solo destino`, and `Origen y destino`. This is synthetic permission context for testing which EmusaSoft source action is available; it is not a Monitor permission or a production write. Because all data is synthetic and rapid repetition is the purpose of this laboratory, the `Anular` and `Rechazar` buttons simulate the EmusaSoft `Anular envío` and `Rechazar recepción` workflows immediately without a confirmation dialog; the resulting original and reverse movements provide the visible confirmation.

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
- Compact inspection and status controls at the far left: eye control, pending-poll indicator, and incident-state indicator.
- Acciones.

Row actions:

- `Recibir` in every permission context because the laboratory must be able to simulate the destination completing the movement;
- `Anular` below `Recibir` when the simulated user controls only the origin zone;
- `Rechazar` as the additional action below `Recibir` when the simulated user controls the destination zone;
- when the user controls both zones, `Rechazar` takes priority and `Anular` is not shown;
- `Ver observaciones`;
- an eye control at the far left, which is the only action that opens the source, expected-result, and Monitor-result detail panel. It changes to the closed-eye form while the panel is open; source actions and row clicks do not open that panel, and a second click closes it.

There is no physical-arrival field. `Recibir` changes only the selected source movement. `Anular` and `Rechazar` close the selected source movement and create a new source movement with a new movement ID, the same material identity, reversed origin and destination, `TRANSITO` state, and a new dispatch clock starting at the action time. The original and reverse movements remain separately traceable. If the original movement already has an open A02 incident, it resolves only after a complete successful poll reads the original movement's terminal source state; the reverse movement is evaluated independently and may later create its own A02 occurrence. The original row leaves the active view only after that poll.

#### Complete movement history

`Ver historial` opens this information in a wide dialog instead of placing a second large table under the active movements. The history includes active and completed movements. Filters include experiment, time, SKU, optional unique code, destination, source state, on-time/late outcome, and incident outcome.

The open history dialog is not rebuilt during ordinary simulated-clock ticks. A completed poll may update its records, but must preserve the tester's exact horizontal and vertical scroll positions so the inspected columns and rows do not move.

The history is a compact fixed event-and-outcome report, not a copy of the active table or a database export. At normal desktop and tablet dialog widths it must fit without horizontal scrolling. It groups related facts vertically instead of giving every field its own column:

- `Registro`: movement, material, quantity, SKU, and optional unique code;
- `Ruta`: origin above destination;
- `Fechas`: dispatch above receipt, cancellation, or rejection;
- fixed final transit duration after closure, or `—` while still active;
- `A02`: concise occurrence count and lifecycle; and
- a compact eye control with an accessible name and explanatory tooltip.

The operational result is conveyed by the accessible leading status icon rather than a repeated text column: green check means completed on time without an alert; red alert means currently open; warning means late, previously alerted, or closed without resolution; blue means still active, pending a poll, cancelled, rejected, or otherwise terminal without an alert. A movement that produced an alert and was later corrected keeps a warning-colored historical marker and a tooltip that says `Problema detectado y resuelto`; it must not look equivalent to an always-clean movement.

The history does not expose a `Preparar recurrencia` shortcut. A02 recurrence is invalid for one specific movement: after receipt, cancellation, or rejection, that movement cannot become unreceived or return to `TRANSITO`; any reverse shipment has a new movement ID and is evaluated independently. A03 recurrence is also invalid for one specific OT: a valid first consumption cannot disappear and a closed OT cannot become active again; another OT is a new case. Reverting completed A05 source records is not a documented EmusaSoft workflow, so A05 recurrence remains deferred until a source-valid workflow is identified.

### 6.4 A03 tab — OTs activas sin primer consumo

Primary action: split button `Iniciar OT`.

Clicking the main button immediately creates an active OT with realistic mock OT, operation, and machine data at the current simulated time. Clicking the narrow arrow opens the same prefilled data in a dialog so the tester can edit it before saving. An OT created in this active table is open and therefore accepts consumption declarations; the laboratory does not offer an invented editable/blocked choice.

The laboratory enforces the EmusaSoft invariant that one machine cannot have two active OTs simultaneously. Concurrent A03 testing therefore uses different machines; attempting to start another OT on an occupied machine is rejected.

Current table columns:

- OT;
- operación;
- máquina;
- hora de inicio;
- tiempo activa;
- consumos válidos;
- primer consumo;
- estado de la OT (`Activa` or `Cerrada`);
- último sondeo;
- estado A03;
- acciones.

Row actions:

- `Registrar primer consumo`;
- `Cerrar OT`, which ends the active source condition without inventing consumption;
- `Ver observaciones`;
- the same compact eye control at the far left for showing or hiding incident detail.

`Ver historial` opens the complete OT history in the same compact dialog pattern used by A02. It groups OT and operation under `Registro`, machine under `Contexto`, and start and closure under `Fechas`. It reports fixed duration after first consumption or OT closure and a concise A03 occurrence/lifecycle summary. The accessible leading icon conveys the operational result, so there is no repeated result column. It does not repeat the live `Tiempo activa` field. History outcomes include first consumption on time, first consumption late, OT closed without consumption, resolved, open, and closed without resolution.

While an OT is open, EmusaSoft permits its material consumption declarations. Closing or cancelling the OT ends the A03 condition and blocks further consumption input. Therefore the active A03 laboratory offers both a real first-consumption correction and OT closure; it does not simulate an open but blocked OT.

### 6.5 A05 tab — Bobinas producidas o remanentes

A05 remains one alert per bobina. Its UI presents `Sin pesar` and `Sigue en máquina` as two independently clearing checklist items; the incident resolves only after both reasons are absent. This avoids duplicate cards, conversations, and notifications for the same physical bobina.

Closing the source OT does not end A05. The bobina may legally be weighed or moved afterward, and those later source actions clear their corresponding checklist items. The Stage 2 matrix includes a dedicated test for this lifecycle boundary.

Primary action: split button `Declarar bobina`.

Clicking the main button immediately creates a bobina with realistic mock data. Clicking the narrow arrow opens the same prefilled data in a dialog so the tester can edit it before saving.

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
- the same compact eye control at the far left for showing or hiding incident detail.

`Ver historial` opens the complete bobina history in the same compact dialog pattern used by A02 and A03. It groups bobina identity under `Registro`, OT, machine, destination, and any generated A02 movement under `Contexto`, and declaration, weighing, and departure vertically under `Fechas`. It reports fixed final duration and a concise A05 occurrence/lifecycle summary. The accessible leading icon conveys the operational result, so there is no repeated result column. It does not repeat the live `Tiempo` or `Razones actuales` fields.

The UI must show `Sin pesar` and `Sigue en máquina` independently. Completing only one action leaves the other reason active. Starting a destination-bound movement creates the appropriate source movement; an unreceived movement later belongs to A02 and must not remain as a duplicate A05 movement reason.

The standalone V2 prototype shows only `Error` once an A05 condition reaches `>= 30 minutes`. The approved presentation decision of 2026-07-31 defines no pre-threshold `Por vencer` state: the condition remains normal before 30 minutes and becomes `Error` at the threshold.

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

The far-left eye is a reversible row control. It opens the subordinate incident panel, changes to the closed-eye icon while that panel is visible, and closes the panel when selected again. Its accessible label changes between `Ver incidente` and `Ocultar incidente`. The remaining row actions stay vertically centered with the operational data.

`Cerrar sin resolución` appears only for an open incident and an authorized administrator. It opens a confirmation dialog requiring reason and comment and shows correlated incidents before confirmation. It never changes the EmusaSoft source state. After confirmation, the incident panel closes and the row leaves the current-work table for the complete history, where its source truth and `Cerrada sin resolución` state remain visible. If the source still reports the condition, Monitor suppresses reopening until a complete healthy poll proves the source condition cleared. Every history table is read-only: it permits inspection through the eye control but exposes no source-changing actions.

#### Routing expectations

- A02 notifies both ends of the recorded transfer: the warehouse dispatcher or sender and the machine operator, plus the applicable supervisors. V2 must not select a primary owner from an unobservable physical-arrival state. The alert catalog now records this correction; contracts, fixtures, and connected routing evidence must be reconciled before Stage 5 acceptance.
- A03 routes to the factory manager, operation shift supervisor, technical leader, and machine operator.
- A05 keeps the process operator as primary. Produced reels also notify the process supervisor. Remnant reels additionally notify the raw-material warehouse dispatcher or sender and its supervisor or leader.
- Routing remains deterministic from versioned rule evidence and the Operational Responsibility Roster. An LLM never chooses recipients.

### 6.7 Integrity tab

The main workflow does not expose four technical failure types. The `Integridad` tab provides:

- one user-facing action: `Hacer fallar el próximo sondeo`;
- an explanation that trustworthy Monitor state must remain unchanged;
- before/after projection and incident counts; and
- snapshot capture;
- downstream counts for evidence, routing deliveries, conversation links, alert messages, and visible cards;
- clickable evidence, delivery, and conversation counts. Their compact viewers identify the alert, source record, timestamp, captured source facts, delivery recipient and status, or linked conversation and message count. These records remain explicitly simulated in the standalone prototype; and
- in the connected implementation, a recovery check proving that a later successful poll completes missing routing or conversation work without duplicating the committed incident. The standalone prototype shows synthetic stable counts only; it does not prove repair of real downstream work.

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
- Source action pending poll: compact blue icon at the far left with accessible label `Cambio pendiente de sondeo`; it disappears after a complete successful poll. The shared explanatory notice floats above the page instead of changing the position of tab content, tables, or scroll state in A02, A03, A05, or Integrity.
- Incident state: compact green check when no incident is open, red exclamation for an open incident, and an accessible text label and tooltip for every state.
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
| Origin cancels dispatch | With `Solo origen`, cancel the selected movement | Original movement closes; one reverse movement starts in `TRANSITO` with a new ID and clock; an open original A02 resolves after the next complete poll |
| Destination rejects reception | With `Solo destino` or `Origen y destino`, reject the selected movement | Cancellation is unavailable when both zones apply; original movement closes; one reverse movement starts in `TRANSITO` with swapped endpoints and a new clock; an open original A02 resolves after the next complete poll |
| Administrative closure | Close an open A02 without source correction | Row moves from current work to history; source truth is preserved, incident detail closes, and reopening is suppressed correctly |
| Recurrence | Not applicable to one specific A02 movement | Invalid scenario: a terminal movement cannot become unreceived; a reverse shipment has a new movement ID |

### 7.3 A03 scenarios

| Scenario | Source timeline | Required result |
| --- | --- | --- |
| Several concurrent OTs | Start OTs minutes apart on different machines | One independently tracked row per OT; a second active OT on the same machine is rejected |
| First consumption before 15 | Register valid consumption before threshold | No A03 incident |
| Exactly 15 and after | Leave selected OT without consumption | Contract comparator determines opening; one occurrence only |
| Mixed population | Some OTs consume, one remains empty, another closes without consumption | Each OT reconciles independently |
| Consumption after incident | Register first valid consumption, then poll | Selected A03 resolves |
| OT closes without consumption | Close or cancel the active OT | A03 resolves because the OT is no longer active; no consumption is invented |
| Failed read after correction | Correct source, fail poll | Existing Monitor state remains until later complete poll |
| Administrative closure | Close an unreconstructable A03 while the source remains unchanged | Row moves to read-only history; source truth is preserved and unchanged polls do not reopen it |

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

### Stage 2 manual prototype review

- concurrent records with staggered start times;
- speed values `1`, `2`, `3`, and `60`;
- polling frequency lower than, equal to, and greater than remaining threshold time;
- running time jump crossing one or several polling times and records' thresholds;
- source action at the same simulated instant as an automatic poll;
- pause immediately before a poll becomes due;
- changing speed or frequency while paused;
- repeated no-op polls;
- correction followed by the prototype's generic failed poll;
- one row corrected while another remains overdue;
- new experiment with earlier history preserved;
- administrative closure while source condition persists;
- source clears after administrative closure, followed by true recurrence;
- synthetic duplicate-prevention counters across incident, evidence, routing, conversation, message, and card;
- snapshot captured while paused and after a failed poll; and
- A05 partial reasons combined with A02 handoff.

### Stages 4–5 automated and connected evidence

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

The full V2 workstream is accepted only when the following Stage 2–5 requirements pass. Completion of the standalone prototype alone does not satisfy this gate:

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

## 10. Preserved V1 audit history and V1-to-V2 reconciliation

This section preserves the durable V1 audit information needed after the predecessor document was archived. V1 evidence remains historical and cannot prove V2 or the separate `test_database` boundary.

### 10.1 V1 implementation audited

The V1 audit covered the Phase 4B `/dev/scenarios` application, its API, synthetic source tables, A02/A03/A05 evaluators, incident lifecycle, routing, conversation integration, Dashboard visibility, and tests.

- The source simulator stored EmusaSoft-like synthetic records inside Monitor's development PostgreSQL database rather than in a separate MySQL source database.
- A02 used one fixed movement, `materialFlowDetailId = 4202`; A03 used one fixed work order, `workOrderId = 4103`; A05 used one fixed reel, `articleSerialId = 4205`.
- A02 evaluated reservation scope, `TRANSITO`, missing receipt, and elapsed dispatch time. Its original `> 30` convention and invented physical-arrival variants were later rejected during Stage 2; current authority uses `>= 30` and no physical-arrival inference.
- Historical V1 A03 behavior evaluated active state, `>= 15` elapsed minutes, zero valid consumption, and a stronger-A07 suppression flag; Stage 2 later rejected that suppression rule.
- A05 evaluated a 30-minute threshold with independent `not_weighed` and `still_at_machine` reasons, but the V1 UI prepared and corrected both reasons together.
- Complete successful polls owned incident reconciliation. Failed or incomplete reads preserved the last trustworthy state. Repeated unchanged polls were designed to preserve one occurrence and deduplicate evidence, routing, conversation links, messages, and cards.
- The V1 source-query work did not complete the production-shaped adapter mapping. A02 still required complete evidence derivation; A03 lacked a versioned SQL detection contract; A05 required translation between query reason flags and evaluator booleans.
- V1 validation reported 36 passing API tests, focused contract fixtures, type checking, production build, responsive browser checks, and synthetic Dashboard/chat visibility. That evidence proved the Monitor-side synthetic lifecycle only; it did not prove a separate EmusaSoft-shaped MySQL source boundary.

### 10.2 Previous `/dev/scenarios` control audit

| V1 control | What it changed | Monitor mutation boundary | V1 problem preserved for history |
| --- | --- | --- | --- |
| `Restablecer` | Deleted the selected alert's synthetic source row and updated scenario metadata | Did not directly write incidents | An empty table was presented as a clean business condition; a later healthy poll was still required to resolve an open incident. |
| `Generar problema` | Inserted or rewrote one fixed source row at the current simulated time | Did not directly write incidents | The label implied detection before polling; reuse while open reset source age; A05 always combined both reasons. |
| `Avanzar tiempo` | Advanced one global simulated clock by fixed increments | Did not directly write incidents | Advancing one alert aged all three; the fixed jump hid exact threshold boundaries. |
| `Corregir origen` | A02 recorded receipt; A03 recorded consumption; A05 set weighed and moved together | Did not directly write incidents | A missing row could make the action a no-op; A05 could not test partial correction. |
| Fault selection | Changed browser-local fault selection | No Monitor mutation | Selection was not scheduled until the separate next-failure action. |
| `Fallo siguiente` | Scheduled a one-shot timeout, source error, partial result, or invalid schema | No Monitor mutation | Pending failure state was hidden and another source action could clear it. |
| `Sondear ahora` | Invoked the ordinary detection runner and consumed a pending fault | Monitor changed only through the approved poller path | Expected and actual downstream results were not clearly separated. |

No V1 source-scenario action was found to write Monitor incident, routing, conversation, or message tables directly. Its primary defects were source realism, usability, hidden state, fixed-record limitations, and the absence of the separate database boundary.

### 10.3 Stage 2 decisions carried into V2

- Material still awaiting warehouse dispatch belongs to A01, not A02.
- A02 starts from a recorded destination-bound movement in `TRANSITO` and measures elapsed time from warehouse dispatch.
- EmusaSoft does not provide a separate fact proving physical arrival without digital receipt; V2 removes that invented field and retains the known intended destination.
- The approved A02 testing convention is `>= 30 minutes`; the user explicitly decided that the one-second distinction must not block the operational test.
- Origin cancellation and destination rejection close the original movement and create a separately identified reverse movement with swapped endpoints and a reset dispatch clock. Rejection takes priority when the user controls both zones.
- V2 replaces duplicate generic clock labels with alert-specific timestamps and elapsed time.
- V2 intentionally uses one shared factory experiment clock so concurrent A02, A03, and A05 records can interact, while each record and incident remains independently identified.

### 10.4 V1-to-V2 coverage audit

The following table challenges V2 against the preserved V1 requirements and findings.

| V1 requirement or finding | V2 result | Critique outcome |
| --- | --- | --- |
| Source, clock, poller, expected, and actual state must be distinguishable | Preserved through shared controls, operational tables, poll summary, and incident panel | V2 must not hide expected-versus-actual comparison inside technical details |
| Clean, before, at, after, persistence, correction, resolution, failed reads, and reset | Preserved and expanded for concurrent records | A02 and A03 recurrence are invalid for the same source record; A05 recurrence is deferred until a source-valid workflow exists; `Nuevo experimento` replaces destructive history reset |
| A05 reasons are independent OR conditions | Preserved explicitly | Partial corrections must work in either order |
| A03/A07 precedence | Rejected during Stage 2 business review | A03 follows only OT activity and first consumption; A07 is evaluated independently and does not suppress A03 |
| A02 physical-arrival routing variants | Rejected | V2 follows the Stage 2 decision that physical arrival is unknowable without receipt; the catalog is corrected and connected contracts, fixtures, and routing evidence remain to be reconciled |
| Independent clocks per alert | Intentionally replaced by one shared experiment clock | Shared time is necessary for interacting factory records; rule state and revisions remain independent even though time is shared |
| Failed-read variants visible in the old UI | Simplified to one understandable integrity action | All technical variants remain mandatory automated tests |
| Exact downstream counts and `Coincide` strictness | Preserved in incident details and acceptance tests | Main UI should translate mismatches into business language |
| No direct Monitor mutation from source actions | Preserved | Administrative closure is the only explicit Monitor action and requires separate authorization and audit |
| Dashboard and conversation integration | Preserved | Ordinary on-time operational history must not create incident cards |
| `test_database` replacement boundary | Preserved | Synthetic source tables remain until replacement acceptance |
| A02/A03/A05 fixed single records | Replaced | Concurrency is a core V2 acceptance requirement |
| Simulated and real timestamps remain separate | Preserved | UI shows simulated business time; audit records retain real server timestamps without confusing the tester |
| Duplicate protections | Preserved | Repeated polls must not duplicate incidents. A02 recurrence is invalid; recurrence protection for alerts with a valid recurring source condition moves to connected or controlled automated testing. |
| Previous browser and automated evidence | Historical only | V1 validation does not validate V2; V2 requires a new complete test and browser evidence set |

### 10.5 Blind-spot attack

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

### 10.6 Authority corrections and remaining contract work

- The catalog, executable alert contract, existing simulator, routing rules, `/dev/scenarios` UI, tests, and V2 prototype now remove A02 pending-dispatch and invented physical-arrival behavior. A02 is defined from the destination-bound `TRANSITO` movement, missing receipt, and time since dispatch. The Stage 4 `test_database` adapter preserves that evidence boundary; Recovery 3 preserved it while replacing the UI composition.
- The catalog, executable alert contract, existing simulator, tests, and V2 prototype now use the approved A02 comparator `current time - sent time >= 30 minutes`.
- The approved A05 presentation uses only `Error` at `>= 30 minutes`; it has no pre-threshold `Por vencer` state. The executable contract now carries only the `Error` label and matches the existing incident predicate.
- Preserve A03's exact 15-minute comparator and define real active, closed/cancelled, and first-consumption mappings in the versioned source contract. Approved authority evaluates A03 independently: A07 does not suppress A03, and both alerts may coexist when their separate conditions are true.

Stage 4 resolution of the executable and integration mismatches:

- the retained fallback simulator still has isolated per-rule scenario clocks; Stage 4 also added shared experiment-runtime foundations, but the older `/dev/scenarios` screen does not expose the approved V2 shared-clock workflow;
- Stage 4 removed `strongerA07` from the A03 contract, simulator path, UI, fixtures, and tests. A03 now evaluates independently from A07.
- Stage 4 connected the older application `/dev/scenarios` composition to `test_database`, the read-only adapter, and Monitor incident state. It did not port or accept the tabbed V2 interface. Routing deliveries, Dashboard cards, conversations, messages, Chat UI, and the connected V2 workflow remain Stage 5 acceptance scope.

## 11. Implementation handoff

The standalone implementation items previously listed here are complete in the V2 HTML prototype: shared clock, scheduler, snapshots, experiment archive, concurrent A02/A03/A05 records, incident detail, administrative closure, integrity counters, cancellation/rejection, and A05-to-A02 handoff. Recurrence is deliberately excluded from the laboratory UI. It is invalid for one specific A02 movement and one specific A03 OT, while no valid EmusaSoft source action has yet been identified for making a completed A05 record qualify again. The corrected prototype matrix is evidence only for that standalone scope.

Recovery 3 preserved the accepted standalone behavior, the authority corrections in Section 10.6, and the proof boundary below while reusing the connected Stage 4 services. Recovery 6 then produced the passing replacement Step 8.2–8.7 evidence. The current order and exit conditions live only in the [Stage 5 recovery and completion plan](./stage5_corrective_execution_plan.md); [`README.md`](./README.md) is the Phase 6 status index.

## 12. Current proof boundary

This document remains the V2 blueprint. The standalone HTML laboratory now implements and demonstrates the synthetic UI, shared clock, scheduler, source actions, snapshots, incident lifecycle, integrity counters, and browser-local experiment archive described here. It does not simulate recurrence by rewriting completed source records. Its browser verification is recorded separately in `alertas_fake_v2_edge_case_test_report_v2.md`.

The prototype remains standalone evidence only. Stage 4 separately implemented and validated the `test_database` writer, read-only Monitor adapter, API authorization, and incident lifecycle. Real routing, Dashboard, conversation, message, and Chat UI acceptance remains in Stage 5; production-scale behavior remains in Phase 10.

Section 10 now preserves the V1 audit facts, prior-control findings, validation scope, and Stage 2 decisions needed for future reference. The superseded predecessor is archived under `archive/docs/implementation/` and has no current authority.
