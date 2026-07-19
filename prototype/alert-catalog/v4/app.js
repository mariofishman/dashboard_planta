const families = [
  {
    code:"A", title:"Material, inventory, and production-data registration", description:"General material and output-registration controls.", alerts:[
      { id:"A01", stage:"Readiness and dispatch", title:"Required material not ready before OT start", state:"upcoming", status:"Por vencer, then Error", changed:["when","detection","resolution"], when:"At 60 minutes before planned OT start, required material is unavailable or unreserved. At 30 minutes, only material that is available and reserved is checked for dispatch; the same incident is updated if it has not been sent.", why:"The OT is at risk of starting without required material at the machine.", causes:"Reservation negligence, unavailable stock, pending supplier delivery, or warehouse dispatch delay.", example:"OT 151200.1 starts at 10:00. At 09:00 one substrate is unavailable or unreserved; at 09:30 a ready material that has not been sent adds the dispatch reason to the same incident.", detection:"At T−60, require both warehouse availability and reservation. At T−30, require dispatch only after both readiness conditions pass. Keep one incident per OT and material, updating its reason instead of creating a second alert.", resolution:"Keep the incident open until every condition required at the current checkpoint passes. At T−60, material must be both available and reserved; neither condition alone is enough. At T−30, it must also be sent to the machine. Rescheduling closes the current incident and creates new checkpoints from the updated planned start through updateWorkOrderPlannedDates and recalculatePlannedDates." },
      { id:"A02", stage:"Transit and receipt", title:"Material flow not received within 30 minutes", state:"error", status:"Error", when:"A sent material flow remains in transit without digital receipt for more than 30 minutes.", why:"Material may have arrived physically while the receiver failed to reproduce the receipt in EMUSA Soft.", causes:"Physical delivery occurred without digital receipt, or physical movement is delayed.", example:"A reel sent to P15 at 09:00 remains En tránsito at 09:31.", detection:"Find sent or in-transit flow details with no receivedAt and elapsed time over 30 minutes. Distinguish OT-linked movement from non-OT relocation." },
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
    code:"E", title:"Extrusion-specific alerts", description:"Resin-container controls that are unique to extrusion.", familyNote:{key:"e-shared-rules", title:"Shared extrusion rules are not duplicated", body:"Extrusion produces reels. Use A04/A05 for extrusion reel declaration, weighing, and movement; C06 for production rate; and D03 for aggregate OT balance. Former E05, E06, and E07 are removed as duplicate alert types."}, alerts:[
      newAlert("E01","Safety inventory","Required extrusion safety inventory is incomplete","upcoming","Por vencer, then Error","Three hours before an extrusion OT starts, a recipe resin or additive is missing from machine-side container inventory needed for the next 24 hours.","The affected or following extrusion OT may stop because required formulation material is not available at the machine.","The planner or supervisor did not request replenishment of the machine safety inventory on time.","At 11:00, an OT planned for 14:00 requires R-17, but its machine has insufficient R-17 for scheduled demand through the next 24 hours.","Use orden_trabajo_receta_snapshot, planned extrusion OTs, and getExtrusionContainersInventory. At T−3 hours, compare every recipe material with calculated 24-hour machine-side demand. Do not use OT reservations or dispatch for extrusion containers; keep both time horizons configurable."),
      newAlert("E02","Opening inventory","Extrusion OT opened without complete starting-container inventory","error","Error","quickStartWorkOrder opens an extrusion OT without operator-declared starting kilograms for every required recipe container.","Actual resin consumption cannot be calculated without complete opening inventory.","The operator omitted a container, its starting quantity, or completion of the opening declaration.","The recipe uses three resins, but starting kilograms exist for only two associated containers.","Match recipe materials to quickStartWorkOrder container associations and require one immutable opening quantity per locationId + articleId. MCP confirms the association but not the exact stored opening field; verify WorkOrderMaterial.quantityIncoming, locationItem.quantity, or add a dedicated snapshot."),
      newAlert("E03","Inventory continuity","Previous closing stock does not match the next opening stock","error","Error","For the same container and resin, the previous OT closing kilograms differ from the next OT opening kilograms beyond container-measurement tolerance.","Inventory continuity between consecutive work orders is broken.","Wrong previous ending stock, wrong current starting stock, or an unrecorded addition/removal between OTs.","OT 151300 closes C-04 with 420 kg of R-17; the next OT opens the same container and resin with 365 kg and no intervening movement.","Compare previous WorkOrderMaterialStockContainer.closeQuantityReturnedReal with the current immutable opening quantity using locationId + articleId. Show both OTs and any intervening material movements."),
      newAlert("E04","Formulation balance","Extrusion resin formulation, consumption, and output do not reconcile","possible","Possible error or Error","Actual container consumption, recipe-expected consumption, and produced output mass do not agree within configured tolerances.","An opening stock, added sack, ending stock, recipe, output, waste, or weighing record may be wrong.","Incorrect opening/ending inventory, undeclared sack addition, wrong output/waste, or a recipe that does not match the run.","Opening plus added sacks minus ending stock gives 1,050 kg consumed, while output and waste represent 900 kg and recipe percentages imply a different resin distribution.","Per container, actual kg = opening + added − ending. Use WorkOrderMaterial additions and container links. Calculate output kg from weight or meters × width × grammage ÷ 1000, then apply orden_trabajo_receta_snapshot percentages. Compare actual resin, recipe expectation, and output+waste. Use D03’s 5% aggregate tolerance and a separately configurable ingredient tolerance; enrich D03 instead of duplicating it.")
    ]
  },
  {
    code:"F", title:"Extrusion-lamination (Exlam) specific alerts", description:"Only cross-material checks unique to Exlam.", familyNote:{key:"f-shared-rules", title:"Exlam reuses existing alert types", body:"Exlam uses one or two substrate reels plus resins instead of adhesive. Reuse A01/A02/A03/A05, C06, D01/D03, and extrusion E01–E03. Former F01–F06 are removed where those shared rules already cover the same condition."}, alerts:[
      newAlert("F01","Combined formulation","Exlam substrate layers and resin formulation do not reconcile","possible","Possible error or Error","The consumed meters and mass of one or two substrate reels, resin consumption, and laminated output do not agree with the Exlam structure.","The combined laminate can be wrong even when each individual material record exists.","Missing substrate consumption, incorrect resin opening/addition/ending stock, wrong layer, missing waste, or incorrect output.","Both substrate reels report expected meters, but container consumption is materially below the resin required by the configured laminate structure.","Use D01 for substrate meters, E04 for actual and expected resin kg, and D03 for combined mass. Create one Exlam incident only when the cross-material structure remains inconsistent; show each substrate and resin separately.")
    ]
  },
  {
    code:"G", title:"Sealing / bag-making specific alerts", description:"Only bag-count and packaging relationships unique to sealing.", familyNote:{key:"g-shared-rules", title:"Sealing reuses existing alert types", body:"Reuse A01/A02/A03 for input reels, A05 for output handling where applicable, A06/C02 for waste, C06 for rate, and D01/D03 for closure. Former G01–G09 are removed or consolidated when those shared rules cover the same condition."}, alerts:[
      newAlert("G01","Bag output","Declared bag output is inconsistent with consumed reel meters","possible","Possible error or Error","Consumed reel meters and the bag specification imply a materially different quantity from declared units or millares after waste.","Bag production may be missing or overstated even though the input reel is valid.","Missing output, wrong bag quantity, wrong consumed meters, or unrecorded sealing waste.","Consumed meters support about 120,000 bags, but only 80,000 are declared and waste does not explain the difference.","Calculate expected units from consumed meters, useful print length, repetitions, bag dimensions, and declared waste using fichas_tecnicas, produccion_trabajo_pedido_detalles, orden_trabajo_salidas, and articulo_serial. Keep one incident with a reason for missing or implausible output."),
      newAlert("G02","Package count","Package, bundle, and bag-unit counts do not reconcile","error","Error","Declared bags do not equal units represented by full bundles, partial bundles, and quantity per package.","The digital packaging structure cannot represent the physical finished bags.","Wrong bundle count, partial units, quantity per package, or duplicate counting across lifecycle states.","Ten 1,000-bag bundles plus a 250-bag partial bundle should equal 10,250 bags, but the OT declares 9,250.","Represented units = full bundles × quantity per package + partial-bundle units. Compare with declared output using orden_trabajo_salidas. Treat observed, unweighed, and weighed counters as lifecycle states, not additive quantities for the same bundle.")
    ]
  }
];

function newAlert(id, stage, title, state, status, when, why, causes, example, detection) {
  return { id, stage, title, state, status, isNew:true, when, why, causes, example, detection };
}

const removed = [
  ["C03 · Specification mismatch", "Removed: output specifications are inherited from the OT and software; operators do not declare them independently."],
  ["C04 · Impossible chronology/value", "Removed: the current workflow prevents production-dependent records before production, and specifications are system-derived."],
  ["C05 · Duplicate serial/event", "Removed: production serial codes are system-generated. The catalog confirms produceArticleSerial and production-series configuration; backend constraint source is not exposed by MCP."]
];

const reviewStorageKey = "emusa-alert-catalog-v4-review";
const reviewStates = ["pending", "approved", "commented"];

function changedSection(alert, key, label, body, className = "") {
  const changed = !alert.isNew && alert.changed?.includes(key);
  return `<section class="${className}${changed ? " review-change" : ""}"${changed ? ` data-review-key="${alert.id.toLowerCase()}-${key}"` : ""}>
    ${changed ? `<button class="review-status" type="button">Pending</button>` : ""}
    <h3>${label}</h3><p>${body}</p>
  </section>`;
}

function alertMarkup(alert, familyCode) {
  const cardChanged = alert.isNew;
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
  return `<section class="family-review-note review-change" data-review-key="${note.key}">
    <button class="review-status" type="button">Pending</button>
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
