const families = [
  {
    code:"A", title:"Material, inventory, and production-data registration", description:"General material and output-registration controls.", alerts:[
      { id:"A01", stage:"Readiness and dispatch", title:"Required material not ready before OT start", state:"upcoming", status:"Por vencer, then Error", when:"At 60 minutes before planned OT start, required material is unavailable or unreserved. At 30 minutes, only material that is available and reserved is checked for dispatch; the same incident is updated if it has not been sent.", why:"The OT is at risk of starting without required material at the machine.", causes:"Reservation negligence, unavailable stock, pending supplier delivery, or warehouse dispatch delay.", example:"OT 151200.1 starts at 10:00. At 09:00 one substrate is unavailable or unreserved; at 09:30 a ready material that has not been sent adds the dispatch reason to the same incident.", detection:"At T−60, require both warehouse availability and reservation. At T−30, require dispatch only after both readiness conditions pass. Keep one incident per OT and material, updating its reason instead of creating a second alert.", resolution:"Keep the incident open until every condition required at the current checkpoint passes. At T−60, material must be both available and reserved; neither condition alone is enough. At T−30, it must also be sent to the machine. Rescheduling closes the current incident and creates new checkpoints from the updated planned start through updateWorkOrderPlannedDates and recalculatePlannedDates." },
      { id:"A02", cardChanged:true, stage:"Transit and receipt", title:"Reserved OT material not received within 30 minutes", state:"error", status:"Error", when:"Material reserved for a work order remains in transit to that OT without digital receipt for more than 30 minutes.", why:"Reserved material may have arrived physically at the machine while the operator failed to record its receipt in EMUSA Soft.", causes:"Physical delivery occurred without digital receipt, or movement to the work-order machine is delayed.", example:"A reel reserved for OT 151087.3 is sent to P15 at 09:00 and remains En tránsito at 09:31.", detection:"Require a material flow linked to a work-order reservation, sent or in transit, with no receivedAt and elapsed time over 30 minutes. Exclude relocations between warehouses or storage locations when the material is not moving toward a work order." },
      { id:"A03", stage:"Consumption", title:"Active OT without consumption after 15 minutes", state:"error", status:"Error", when:"An OT has been active for 15 minutes without a first consumption declaration.", why:"The first raw-material reel being used should already be represented digitally.", causes:"The operator completed initial setup but did not declare the first reel.", example:"OT 151087.3 starts at 09:00 and still has zero consumption at 09:15.", detection:"Require OT active, elapsed execution time at least 15 minutes, and consumption count zero. Do not duplicate this when production exists." },
      { id:"A04", stage:"Production declaration", title:"Possible undeclared produced reel", state:"possible", status:"Possible error", when:"Estimated mass remaining on the rewinder exceeds its physical capacity.", why:"Enough material has been consumed that another finished reel should already have been declared.", causes:"Delayed output declaration or an inaccurate statistical estimate.", example:"Input is 1,500 kg, declared output is 900 kg, and waste is 100 kg. The 500 kg remainder equals rewinder capacity; consuming more without another output declaration creates a warning.", detection:"Remaining mass = consumed input − actual or estimated declared output − actual or estimated waste. Do not subtract generic process loss. Use scale net weight when available; otherwise join article_serial, orden_trabajo_salidas, width, grammage, linear meters when present, and comparable weighed reels. Theoretical kg ≈ grammage × width × length ÷ 1000. If length is absent, use a width-adjusted historical model and lower confidence." },
      { id:"A05", stage:"Post-production handling", title:"Produced reel not weighed or not moved", state:"upcoming", status:"Por vencer, then Error", when:"A produced reel is unweighed after 30 minutes, or remains at a finished OT’s machine for more than 30 minutes.", why:"Weight is required for cost and inventory quantity; finished output must also enter its next workflow.", causes:"Missed weighing, process-team delay, or unrecorded movement.", example:"CU-98421 is unweighed and still at P15 after 30 minutes; one incident can show one or both reasons.", detection:"These are OR conditions. Add not_weighed after 30 minutes without a scale record. Independently add still_at_machine after OT finish plus 30 minutes without movement. The incident may contain either reason or both. Once movement begins, an unreceived flow uses A02." },
      { id:"A06", stage:"Waste registration and weighing", title:"Waste missing or not weighed", state:"possible", status:"Possible error or Error", when:"Declared waste remains unweighed, or OT balance and expected waste indicate missing waste.", why:"Waste weight supports OT balance and waste-control analysis. It does not allocate raw-material cost, which is divided across good production, but it is essential for later waste reduction.", causes:"Undeclared waste, missed weighing, wrong waste category, or an atypical run.", example:"Comparable OTs expect 70–100 kg of waste; this OT closes with 5 kg and an unexplained balance gap.", detection:"Use scale records for declared waste. Source theoretical waste from operaciones → cotizacion_config_waste → cotizacion_config_valores, lot-size bands from cotizacion_config_rangos and cotizacion_config_rango_valores, and substrate adjustments from cotizacion_config_waste_gap and its taxon detail. Compare with historical OT waste; a derived statistics table may cache aggregates but raw OT, serial, and scale data remain authoritative." }
    ]
  },
  {
    code:"B", title:"Production-plan adherence and machine activity", description:"Protects the planner’s current recorded schedule.", alerts:[
      { id:"B01", stage:"Sequence", title:"OT started outside the latest approved plan sequence", state:"error", status:"Error", when:"An operator starts an OT that is not next in the latest recorded sequence.", why:"Actual execution no longer matches the planner’s plan or a recorded floor update.", causes:"Wrong OT, disorganization, late material, or an unrecorded sequence change.", example:"The operator skips 151099.1 and starts 151104.1 without updating the plan.", detection:"Compare the started OT with the first pending OT on the machine’s latest plan." },
      { id:"B02", stage:"Planned start", title:"Planned OT has not started on time", state:"error", status:"Error", when:"The planned start arrives but the expected OT has not started and the plan was not updated.", why:"Recorded plan and factory execution have diverged.", causes:"Previous OT delay, setup, material, operator, machine problem, or unrecorded change.", example:"OT 151230.1 should start at 16:00 but has not started.", detection:"Find the first pending OT whose planned start is in the past and which has no execution start or rescheduling event.", resolution:"If the previous OT is still running, the planner enters the expected delay and selects Update All Plan to shift every later OT. If nothing is running, record a categorized equipment pause—maintenance, intentional hold, waiting for material, or another explained reason—then shift the remaining plan. Existing ERP operations updateWorkOrderPlannedDates and recalculatePlannedDates support the date change." },
      { id:"B03", stage:"Machine activity", title:"Machine has no active OT for more than 30 minutes", state:"error", status:"Error", when:"A machine expected to produce has no active OT for more than 30 minutes.", why:"Planned time is being lost without an active work order.", causes:"Unrecorded stoppage, maintenance, waiting, operator delay, or stale plan.", example:"P09 is scheduled but has no active OT from 14:00 to 14:31.", detection:"Exclude recorded maintenance, shutdown, approved pause, and no-production periods.", resolution:"Record the real state using equipo_pausa with category, explanation when required, and expected duration; then run Update All Plan. Close when an OT starts, a valid pause is recorded, or the plan no longer expects production in that interval." }
    ]
  },
  {
    code:"C", title:"Statistical and physical plausibility", description:"Only conditions that the ERP can actually represent remain.", alerts:[
      { id:"C01", stage:"Weight plausibility", title:"Produced reel weight outside the plausible range", state:"possible", status:"Possible error", when:"Recorded net weight is outside physical or reliable historical limits.", why:"An implausible weight corrupts inventory, yield, and cost.", causes:"Scale, unit, barcode, or exceptional-production issue.", example:"A reel is weighed at 3,000 kg when comparable reels are 250–600 kg.", detection:"Read peso_neto from balanza_carga_detalle_registros and join article_serial, orden_trabajo_salidas, and ordenes_trabajo. When meters exist, expected kg = grammage × width × length ÷ 1000. Build ranges from the previous 12 months of weighed reels with the same substrate and grammage, segmented by operation/machine and adjusted for width. A derived table may cache sample count, median, percentiles, and model version." },
      { id:"C02", stage:"Waste plausibility", title:"Waste amount outside the plausible range", state:"possible", status:"Possible error", when:"Waste weight or percentage is outside the expected range for comparable OTs.", why:"Low waste may mean missing declarations; high waste may be wrong or operationally important.", causes:"Missing bag, wrong weight/category, setup loss, or atypical conditions.", example:"Comparable 20,000-meter OTs produce 60–100 kg, but this OT declares 5 kg or 450 kg.", detection:"Combine the quotation waste matrix—operation, kilogram lot-size range, approved value, and substrate/taxon gap—with historical waste serial and scale data grouped by operation, substrate, machine, and OT-size band. Store only derived statistics in a cache table or materialized view and show which baseline triggered the warning." },
      { id:"C06", stage:"Rate plausibility", title:"Production rate outside the machine’s plausible range", state:"possible", status:"Possible error", changed:["example"], when:"Produced meters or kilograms divided by the OT execution interval imply a rate materially above or below the machine range.", why:"Production quantity may be wrong, or the OT may have been opened too early or closed too late.", causes:"Incorrect production, OT left open, late close, unrecorded pause, or exceptional production.", example:"A Comexi expected near 250 m/min or a faster Miraflex expected near 350 m/min implies 1,200 m/min or an abnormally low rate.", detection:"Use fecha_inicio_ejecucion and fecha_fin_ejecucion created by Open/Close Work Order. Subtract equipo_pausa intervals. Divide meters and kilograms by effective runtime; compare with equipos.velocidad_maquina and historical rates by machine, product, width, and setup. State whether quantity or open/close timing is the likely cause." }
    ]
  },
  {
    code:"D", title:"Work-order closure and material balance", description:"Reconciles declared meters, consumed material, good output, and waste.", alerts:[
      { id:"D01", stage:"Closure meters", title:"Declared meters exceed consumed-reel meters", state:"error", status:"Error · Confirmed", when:"At closure, run meters exceed meters supported by consumed reels.", why:"Production cannot be explained by recorded consumption.", causes:"Missing consumption, wrong run meters, reel data, or closure.", example:"Consumed reels support 30,000 m but closure declares 40,000 m.", detection:"Estimate meters from consumed-reel weight, width, and grammage; compare with declared run meters using tolerance." },
      { id:"D02", stage:"Closure material", title:"Completed OT has delivered reserved reels unconsumed", state:"error", status:"Error · Confirmed", when:"Full planned production completes while a delivered reserved reel remains unconsumed.", why:"A fully completed OT should have used and declared delivered planned material.", causes:"Missing consumption, wrong completion, or wrong reservation quantity.", example:"Four reels were delivered, full production completed, but only three were consumed.", detection:"Require full production, delivered reservations, and an unconsumed delivered reel. Do not apply automatically to truncation." },
      { id:"D03", stage:"Closure mass balance", title:"OT input, good production, and waste do not balance", state:"possible", status:"Possible error or Error", changed:["when","example","detection"], when:"At closure, the absolute balance gap exceeds 5% of total good-production mass. The percentage is initially configurable.", why:"A production, waste, consumption, or weighing record may be missing or wrong.", causes:"Undeclared output/waste, unweighed output, wrong weight, or missing consumption.", example:"Input is 1,500 kg, output is 1,300 kg, and waste is 90 kg. The 110 kg gap exceeds the current 65 kg tolerance: 5% of good production.", detection:"Balance gap = consumed input − good output − waste. Allowed gap = 0.05 × total good-production mass; keep 0.05 configurable. Alert when the absolute gap exceeds the allowed gap. Do not subtract undefined process loss. Use scale weights and documented estimates, recalculate as actual weights arrive, and suppress D03 when a specific A or D incident explains the gap." }
    ]
  },
  {
    code:"E", title:"Extrusion-specific alerts", description:"Resin inventory and formulation controls unique to extrusion and Exlam.", familyNote:{key:"e-shared-rules-v5", title:"Aggregate balance and resin proportions are separate checks", body:"D03 checks whether total input equals good output plus waste. E04 checks whether the resin mix matches the recipe and can fail even when D03 passes. Extrusion and Exlam share E04; reel declaration, handling, rate, and aggregate balance continue to use A04/A05, C06, and D03."}, alerts:[
      { id:"E01", stage:"Safety inventory", title:"Required extrusion safety inventory is incomplete", state:"upcoming", status:"Por vencer, then Error", changedV6:["when","example","detection"], when:"Three hours before an extrusion OT starts, a required resin or additive is missing from the machine-specific safety warehouse or its stock is insufficient for the next 4 hours of scheduled demand.", why:"The affected or following extrusion OT may stop because required formulation material is not available near the machine.", causes:"The planner or supervisor did not request replenishment of the machine-specific safety warehouse on time.", example:"At 11:00, an OT planned for 14:00 requires R-17, but the safety warehouse assigned to that machine has insufficient R-17 for scheduled demand through the next 4 hours.", detection:"Use orden_trabajo_receta_snapshot and planned extrusion OTs to calculate 4-hour demand. Compare it with resin stock in the warehouse assigned to that machine, using Warehouse and ArticleWarehouseStock or the equivalent stock query after confirming the machine-to-warehouse mapping. Do not use current OT containers for this readiness rule: each container holds one resin for the current OT, while the safety warehouse protects current and near-term orders." },
      newAlert("E02","Opening inventory","Extrusion OT opened without complete starting-container inventory","error","Error","quickStartWorkOrder opens an extrusion OT without operator-declared starting kilograms for every required recipe container.","Actual resin consumption cannot be calculated without complete opening inventory.","The operator omitted a container, its starting quantity, or completion of the opening declaration.","The recipe uses three resins, but starting kilograms exist for only two associated containers.","Match recipe materials to quickStartWorkOrder container associations and require one immutable opening quantity per locationId + articleId. MCP confirms the association but not the exact stored opening field; verify WorkOrderMaterial.quantityIncoming, locationItem.quantity, or add a dedicated snapshot."),
      newAlert("E03","Inventory continuity","Previous closing stock does not match the next opening stock","error","Error","For the same container and resin, the previous OT closing kilograms differ from the next OT opening kilograms beyond container-measurement tolerance.","Inventory continuity between consecutive work orders is broken.","Wrong previous ending stock, wrong current starting stock, or an unrecorded addition/removal between OTs.","OT 151300 closes C-04 with 420 kg of R-17; the next OT opens the same container and resin with 365 kg and no intervening movement.","Compare previous WorkOrderMaterialStockContainer.closeQuantityReturnedReal with the current immutable opening quantity using locationId + articleId. Show both OTs and any intervening material movements."),
      changedAlert("E04","Formulation proportions","Consumed resin proportions do not match the recipe","possible","Possible error or Error","The total resin mass can balance production plus waste, but one or more actual resin or screw percentages differ from the recipe beyond a configurable ingredient tolerance.","Aggregate balance cannot detect a wrong formulation: excess of one resin can offset a shortage of another while total kilograms remain correct.","Incorrect starting or ending container inventory, undeclared sack addition, resin associated with the wrong screw, or the wrong recipe snapshot.","The recipe requires 5% resin A and 95% resin B. Actual calculated consumption is 10% and 90%. Total resin kilograms still balance output plus waste, so D03 passes but E04 alerts.","For every resin and screw, actual consumed kg = opening kg + added kg − ending kg. Divide each actual resin amount by total actual resin to obtain its percentage. Compare it with orden_trabajo_receta_snapshot percentages using a separately configurable ingredient tolerance. Use the same E04 code for extrusion and Exlam. Run D03 independently for aggregate mass balance; do not merge or duplicate the incidents.")
    ]
  },
  {
    code:"F", title:"Extrusion-lamination (Exlam)", description:"Exlam reuses shared reel, resin, rate, and balance alerts.", familyNote:{key:"f-shared-rules-v5", title:"F01 is consolidated into E04", body:"Exlam consumes one or two substrate reels and uses resins instead of adhesive. Use A01/A02/A03 for substrate flow, A04/A05 for output, C06 for rate, D01/D03 for closure, and E01–E04 for resin inventory and formulation. The former F01 is removed: wrong resin proportions are the same E04 condition in extrusion and Exlam."}, alerts:[]
  },
  {
    code:"G", title:"Sealing / bag making", description:"Sealing reuses shared material, waste, rate, and closure alerts.", familyNote:{key:"g-shared-rules-v6", changed:true, title:"Bag production is not part of A04", body:"Use A01/A02/A03 for input reels, A05 for output handling where applicable, A06/C02 for waste, C06 for rate, and D01/D03 for closure. A04 remains specific to rewinder-capacity evidence for produced reels. No bag-production declaration alert is included until a separate worker-and-box handling rule is defined and supported by ERP evidence. G02 remains removed as unverified."}, alerts:[]
  }
];

function newAlert(id, stage, title, state, status, when, why, causes, example, detection) {
  return { id, stage, title, state, status, when, why, causes, example, detection };
}

function changedAlert(id, stage, title, state, status, when, why, causes, example, detection) {
  return { id, stage, title, state, status, when, why, causes, example, detection };
}

const recommendedResolutions = {
  A01: "Reserve the material, confirm warehouse availability, and dispatch it before the applicable checkpoint; reschedule the OT when readiness cannot be restored in time. If the material was physically sent and consumed outside EMUSA Soft and the missing historical steps can no longer be entered safely, do not invent reservations, movements, receipts, or consumption. An administrator closes A01 without resolution and closes the linked consequences for the same OT and material as one audited exception.",
  A02: "Record the receipt when the reserved material physically reached the OT destination. If it did not arrive, correct or cancel the movement and create the proper dispatch. When the old physical location and handoff can no longer be proven, an administrator closes the incident without resolution, records the last known location and reason, and includes only linked incidents from the same OT movement.",
  A03: "Declare the actual consumed reel when it is traceable and EMUSA Soft still permits a valid declaration. Correct an incorrectly opened OT when that is the cause. If production already occurred and the exact reel or quantity cannot be reconstructed, close without resolution; preserve the missing-consumption fact and link any D01 or D03 consequence instead of fabricating consumption.",
  A04: "Declare the missing produced reel or correct the input, output, waste, or weight record that created the excess remainder. If physical verification shows no undeclared reel and the estimate was a false positive, an administrator closes without resolution using reason Verified physical exception and attaches the supporting observation.",
  A05: "Weigh the reel and record its movement to the required warehouse or next OT. Correct the scale, barcode, or movement record when the action occurred but was recorded incorrectly. If the reel is no longer traceable, close without resolution with its last known location and keep any related inventory discrepancy linked to the same incident chain.",
  A06: "Declare missing waste, weigh the waste, or correct its weight and category. For a statistical warning, verify the run against physical and historical evidence. If the missing bag or exact quantity can no longer be recovered, close without resolution with the known estimate and link the resulting D03 balance gap.",
  B01: "Do not attempt to undo an OT that already started. Update the current production plan, record why the sequence changed, and reschedule affected later OTs. Then close the incident as an explained deviation; use administrative closure without resolution when the historical sequence change was never recorded and cannot be reconstructed.",
  B02: "Start the planned OT, record the real pause or cause of delay, or reschedule it and run Update All Plan so later OTs move consistently. If the time window has passed and no reliable cause can be reconstructed, an administrator closes without resolution with the observed delay and affected plan version.",
  B03: "Start the next OT, record the real equipment pause with category and expected duration, or update the plan so the interval is no longer expected production time. If the idle interval is historical and its cause cannot be recovered, close without resolution and retain the unexplained downtime duration for analysis.",
  C01: "Reweigh the reel and correct the unit, barcode, or scale association when wrong. If a second verified measurement confirms an exceptional but valid reel, close without resolution as Verified physical exception; preserve both the original and verification evidence.",
  C02: "Reweigh the waste, correct its category or unit, or add a missing bag declaration. If the value is physically verified as an exceptional run, close without resolution as Verified physical exception rather than changing a correct weight to fit the expected range.",
  C06: "Correct the production quantity, OT opening or closing event, or missing pause that distorted effective runtime. If the rate is verified as a legitimate exceptional run, close without resolution with the evidence and model version that produced the warning.",
  D01: "Declare the missing consumed reel or correct run meters, reel weight, width, grammage, or closure data. If the OT is historically locked and the source record cannot be recovered, close without resolution with the remaining meter difference and link D03 rather than entering invented consumption.",
  D02: "Declare a delivered reel that was actually consumed, return or reassign an unused reel through the valid inventory flow, or correct completion or reservation quantity. If the completed OT is locked and the reel disposition cannot be proven, close without resolution and preserve the unreconciled reel as an inventory exception.",
  D03: "Resolve the most specific underlying incident first: missing consumption, output, waste, or weight. Recalculate the balance after corrected or actual weights arrive. If the residual gap cannot be reconstructed or is accepted as a documented physical exception, close without resolution with the final gap, tolerance, evidence, and linked cause incidents.",
  E01: "Replenish the machine safety warehouse, use an approved substitute, or reschedule or cancel the affected OT. Close normally when the configured four-hour coverage is restored or the demand window changes. Close without resolution only for a historical readiness warning whose window has passed, recording whether production continued or stopped.",
  E02: "Capture complete starting kilograms before production. If the OT already ran, reconstruct opening quantities only from traceable closing stock, additions, and movements. Otherwise close without resolution and link the resulting E03, E04, or D03 incidents instead of inventing opening inventory.",
  E03: "Correct the previous closing quantity, current opening quantity, or missing intervening resin movement. If neither side can be proven, close without resolution for the OT pair and preserve the unexplained container-and-resin difference for inventory follow-up.",
  E04: "Correct the opening, added, or ending resin quantities, screw association, or recipe snapshot that caused the wrong proportions. If records are verified and production intentionally used a different approved mix, close without resolution as Approved formulation exception with the authorizing person and reason."
};

families.flatMap(family => family.alerts).forEach(alert => {
  alert.resolution = recommendedResolutions[alert.id];
  alert.changedV6 = [...new Set([...(alert.changedV6 || []), "resolution"])];
});

const removed = [
  ["C03 · Specification mismatch", "Removed: output specifications are inherited from the OT and software; operators do not declare them independently."],
  ["C04 · Impossible chronology/value", "Removed: the current workflow prevents production-dependent records before production, and specifications are system-derived."],
  ["C05 · Duplicate serial/event", "Removed: production serial codes are system-generated. The catalog confirms produceArticleSerial and production-series configuration; backend constraint source is not exposed by MCP."]
];

const reviewStorageKey = "emusa-alert-catalog-v6-review";
const reviewStates = ["pending", "approved", "commented"];

function changedSection(alert, key, label, body, className = "") {
  const changed = !alert.cardChanged && alert.changedV6?.includes(key);
  return `<section class="${className}${changed ? " review-change" : ""}"${changed ? ` data-review-key="${alert.id.toLowerCase()}-${key}"` : ""}>
    ${changed ? `<button class="review-status" type="button">Pending</button>` : ""}
    <h3>${label}</h3><p>${body}</p>
  </section>`;
}

function alertMarkup(alert, familyCode) {
  const cardChanged = alert.cardChanged;
  return `<article class="alert-card family-${familyCode.toLowerCase()} state-${alert.state}${cardChanged ? " review-change new-alert" : ""}" id="${alert.id.toLowerCase()}"${cardChanged ? ` data-review-key="${alert.id.toLowerCase()}-new"` : ""}>
    ${cardChanged ? `<button class="review-status" type="button">Pending</button>` : ""}
    <div class="card-heading"><div><span class="alert-id">${alert.id} · ${alert.stage}</span><h2>${alert.title}</h2></div><span class="state-pill${alert.status === "Candidate" ? " candidate-pill" : ""}">${alert.status}</span></div>
    <div class="definition-grid">
      ${changedSection(alert,"when","When it happens",alert.when)}
      ${changedSection(alert,"why","Why the alert exists",alert.why)}
      ${changedSection(alert,"causes","Possible causes",alert.causes)}
      ${changedSection(alert,"example","Example",alert.example)}
    </div>
    ${changedSection(alert,"detection","Detection indicators and algorithm",alert.detection,"detection-rule")}
    ${alert.resolution ? changedSection(alert,"resolution","Recommended resolution",alert.resolution,"resolution-rule") : ""}
  </article>`;
}

function familyNoteMarkup(note) {
  if (!note) return "";
  const changed = note.changed === true;
  return `<section class="family-review-note${changed ? " review-change" : ""}"${changed ? ` data-review-key="${note.key}"` : ""}>
    ${changed ? `<button class="review-status" type="button">Pending</button>` : ""}
    <h3>${note.title}</h3><p>${note.body}</p>
  </section>`;
}

document.querySelector("#alert-index").innerHTML = families.map(f => `<a href="#family-${f.code.toLowerCase()}">${f.code}</a>${f.alerts.map(a => `<a href="#${a.id.toLowerCase()}">${a.id}</a>`).join("")}`).join("") + `<a href="#removed-alerts">Removed</a>`;
document.querySelector("#catalog").innerHTML = families.map(f => `<section class="family-section"><div class="family-heading" id="family-${f.code.toLowerCase()}"><span class="family-code">${f.code}</span><div><h2>${f.title}</h2><p>${f.description}</p></div></div>${familyNoteMarkup(f.familyNote)}${f.alerts.map(a => alertMarkup(a,f.code)).join("")}</section>`).join("");
document.querySelector("#removed-list").innerHTML = removed.map(([title,body]) => `<section><strong>${title}</strong><p>${body}</p></section>`).join("");

function loadReviewState() {
  try { return JSON.parse(localStorage.getItem(reviewStorageKey) || "{}"); } catch { return {}; }
}

function setReviewVisual(section, state) {
  section.dataset.reviewState = state;
  const button = section.querySelector(":scope > .review-status");
  if (button) {
    button.textContent = state[0].toUpperCase() + state.slice(1);
    button.setAttribute("aria-label", `${state[0].toUpperCase() + state.slice(1)}: ${section.dataset.reviewKey}`);
    button.setAttribute("aria-pressed", state === "approved" ? "true" : "false");
  }
}

function updateProgress() {
  const sections = [...document.querySelectorAll(".review-change[data-review-key]")];
  const reviewed = sections.filter(section => section.dataset.reviewState !== "pending").length;
  document.querySelector("#review-progress").textContent = `${reviewed} of ${sections.length} reviewed`;
}

const savedReview = loadReviewState();
document.querySelectorAll(".review-change[data-review-key]").forEach(section => {
  const key = section.dataset.reviewKey;
  setReviewVisual(section, savedReview[key] || "pending");
  const button = section.querySelector(":scope > .review-status");
  button?.addEventListener("click", () => {
    const current = section.dataset.reviewState || "pending";
    const next = reviewStates[(reviewStates.indexOf(current) + 1) % reviewStates.length];
    savedReview[key] = next;
    localStorage.setItem(reviewStorageKey, JSON.stringify(savedReview));
    setReviewVisual(section, next);
    updateProgress();
  });
});
updateProgress();
