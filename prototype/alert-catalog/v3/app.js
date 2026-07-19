const families = [
  {
    code: "A", title: "Material, inventory, and production-data registration", description: "Printing, lamination, adhesive lamination, and cutting.", alerts: [
      { id:"A01", stage:"Readiness and dispatch", title:"Required material not ready before OT start", state:"upcoming", status:"Por vencer, then Error", changed:["resolution"], when:"At 60 minutes before planned OT start, required material is unavailable or unreserved. At 30 minutes before start, the same incident is updated if material has not been dispatched.", why:"The OT is at risk of starting without required material at the machine.", causes:"Reservation negligence, unavailable stock, pending supplier delivery, or warehouse dispatch delay.", example:"OT 151200.1 starts at 10:00. At 09:00 one substrate is unavailable; at 09:30 the same incident adds its dispatch state.", detection:"Evaluate material, reservation, warehouse availability, purchase/supplier status, and dispatch at the two checkpoints. Keep one incident per OT and required material.", resolution:"Close when the material becomes available, is reserved, or is dispatched. Also close when an authorized user reschedules the OT: the updated planned start creates new 60- and 30-minute checkpoints. Use updateWorkOrderPlannedDates and recalculatePlannedDates." },
      { id:"A02", stage:"Transit and receipt", title:"Material flow not received within 30 minutes", state:"error", status:"Error", when:"A sent material flow remains in transit without digital receipt for more than 30 minutes.", why:"Material may have arrived physically while the receiver failed to reproduce the receipt in EMUSA Soft.", causes:"Physical delivery occurred without digital receipt, or physical movement is delayed.", example:"A reel sent to P15 at 09:00 remains En tránsito at 09:31.", detection:"Find sent or in-transit flow details with no receivedAt and elapsed time over 30 minutes. Distinguish OT-linked movement from non-OT relocation." },
      { id:"A03", stage:"Consumption", title:"Active OT without consumption after 15 minutes", state:"error", status:"Error", when:"An OT has been active for 15 minutes without a first consumption declaration.", why:"The first raw-material reel being used should already be represented digitally.", causes:"The operator completed initial setup but did not declare the first reel.", example:"OT 151087.3 starts at 09:00 and still has zero consumption at 09:15.", detection:"Require OT active, elapsed execution time at least 15 minutes, and consumption count zero. Do not duplicate this when production exists." },
      { id:"A04", stage:"Production declaration", title:"Possible undeclared produced reel", state:"possible", status:"Possible error", changed:["example","detection"], when:"Estimated mass remaining on the rewinder exceeds its physical capacity.", why:"Enough material has been consumed that another finished reel should already have been declared.", causes:"Delayed output declaration or an inaccurate statistical estimate.", example:"Input is 1,500 kg, declared output is 900 kg, and waste is 100 kg. The 500 kg remainder equals rewinder capacity; consuming more without another output declaration creates a warning.", detection:"Remaining mass = consumed input − actual or estimated declared output − actual or estimated waste. Do not subtract generic process loss. Use scale net weight when available; otherwise join article_serial, orden_trabajo_salidas, width, grammage, linear meters when present, and comparable weighed reels. Theoretical kg ≈ grammage × width × length ÷ 1000. If length is absent, use a width-adjusted historical model and lower confidence." },
      { id:"A05", stage:"Post-production handling", title:"Produced reel not weighed or not moved", state:"upcoming", status:"Por vencer, then Error", changed:["detection"], when:"A produced reel is unweighed after 30 minutes, or remains at a finished OT’s machine for more than 30 minutes.", why:"Weight is required for cost and inventory quantity; finished output must also enter its next workflow.", causes:"Missed weighing, process-team delay, or unrecorded movement.", example:"CU-98421 is unweighed and still at P15 after 30 minutes; one incident can show one or both reasons.", detection:"These are OR conditions. Add not_weighed after 30 minutes without a scale record. Independently add still_at_machine after OT finish plus 30 minutes without movement. The incident may contain either reason or both. Once movement begins, an unreceived flow uses A02." },
      { id:"A06", stage:"Waste registration and weighing", title:"Waste missing or not weighed", state:"possible", status:"Possible error or Error", changed:["why","detection"], when:"Declared waste remains unweighed, or OT balance and expected waste indicate missing waste.", why:"Waste weight supports OT balance and waste-control analysis. It does not allocate raw-material cost, which is divided across good production, but it is essential for later waste reduction.", causes:"Undeclared waste, missed weighing, wrong waste category, or an atypical run.", example:"Comparable OTs expect 70–100 kg of waste; this OT closes with 5 kg and an unexplained balance gap.", detection:"Use scale records for declared waste. Source theoretical waste from operaciones → cotizacion_config_waste → cotizacion_config_valores, lot-size bands from cotizacion_config_rangos and cotizacion_config_rango_valores, and substrate adjustments from cotizacion_config_waste_gap and its taxon detail. Compare with historical OT waste; a derived statistics table may cache aggregates but raw OT, serial, and scale data remain authoritative." }
    ]
  },
  {
    code:"B", title:"Production-plan adherence and machine activity", description:"Protects the planner’s current recorded schedule.", alerts:[
      { id:"B01", stage:"Sequence", title:"OT started outside the latest approved plan sequence", state:"error", status:"Error", when:"An operator starts an OT that is not next in the latest recorded sequence.", why:"Actual execution no longer matches the planner’s plan or a recorded floor update.", causes:"Wrong OT, disorganization, late material, or an unrecorded sequence change.", example:"The operator skips 151099.1 and starts 151104.1 without updating the plan.", detection:"Compare the started OT with the first pending OT on the machine’s latest plan." },
      { id:"B02", stage:"Planned start", title:"Planned OT has not started on time", state:"error", status:"Error", changed:["resolution"], when:"The planned start arrives but the expected OT has not started and the plan was not updated.", why:"Recorded plan and factory execution have diverged.", causes:"Previous OT delay, setup, material, operator, machine problem, or unrecorded change.", example:"OT 151230.1 should start at 16:00 but has not started.", detection:"Find the first pending OT whose planned start is in the past and which has no execution start or rescheduling event.", resolution:"If the previous OT is still running, the planner enters the expected delay and selects Update All Plan to shift every later OT. If nothing is running, record a categorized equipment pause—maintenance, intentional hold, waiting for material, or another explained reason—then shift the remaining plan. Existing ERP operations updateWorkOrderPlannedDates and recalculatePlannedDates support the date change." },
      { id:"B03", stage:"Machine activity", title:"Machine has no active OT for more than 30 minutes", state:"error", status:"Error", changed:["resolution"], when:"A machine expected to produce has no active OT for more than 30 minutes.", why:"Planned time is being lost without an active work order.", causes:"Unrecorded stoppage, maintenance, waiting, operator delay, or stale plan.", example:"P09 is scheduled but has no active OT from 14:00 to 14:31.", detection:"Exclude recorded maintenance, shutdown, approved pause, and no-production periods.", resolution:"Record the real state using equipo_pausa with category, explanation when required, and expected duration; then run Update All Plan. Close when an OT starts, a valid pause is recorded, or the plan no longer expects production in that interval." }
    ]
  },
  {
    code:"C", title:"Statistical and physical plausibility", description:"Only conditions that the ERP can actually represent remain.", alerts:[
      { id:"C01", stage:"Weight plausibility", title:"Produced reel weight outside the plausible range", state:"possible", status:"Possible error", changed:["detection"], when:"Recorded net weight is outside physical or reliable historical limits.", why:"An implausible weight corrupts inventory, yield, and cost.", causes:"Scale, unit, barcode, or exceptional-production issue.", example:"A reel is weighed at 3,000 kg when comparable reels are 250–600 kg.", detection:"Read peso_neto from balanza_carga_detalle_registros and join article_serial, orden_trabajo_salidas, and ordenes_trabajo. When meters exist, expected kg = grammage × width × length ÷ 1000. Build ranges from the previous 12 months of weighed reels with the same substrate and grammage, segmented by operation/machine and adjusted for width. A derived table may cache sample count, median, percentiles, and model version." },
      { id:"C02", stage:"Waste plausibility", title:"Waste amount outside the plausible range", state:"possible", status:"Possible error", changed:["detection"], when:"Waste weight or percentage is outside the expected range for comparable OTs.", why:"Low waste may mean missing declarations; high waste may be wrong or operationally important.", causes:"Missing bag, wrong weight/category, setup loss, or atypical conditions.", example:"Comparable 20,000-meter OTs produce 60–100 kg, but this OT declares 5 kg or 450 kg.", detection:"Combine the quotation waste matrix—operation, kilogram lot-size range, approved value, and substrate/taxon gap—with historical waste serial and scale data grouped by operation, substrate, machine, and OT-size band. Store only derived statistics in a cache table or materialized view and show which baseline triggered the warning." },
      { id:"C06", stage:"Rate plausibility", title:"Production rate outside the machine’s plausible range", state:"possible", status:"Possible error", changed:["when","why","causes","detection"], when:"Produced meters or kilograms divided by the OT execution interval imply a rate materially above or below the machine range.", why:"Production quantity may be wrong, or the OT may have been opened too early or closed too late.", causes:"Incorrect production, OT left open, late close, unrecorded pause, or exceptional production.", example:"A Comexi expected near 250 m/min or another press expected near 350 m/min implies 1,200 m/min or an abnormally low rate.", detection:"Use fecha_inicio_ejecucion and fecha_fin_ejecucion created by Open/Close Work Order. Subtract equipo_pausa intervals. Divide meters and kilograms by effective runtime; compare with equipos.velocidad_maquina and historical rates by machine, product, width, and setup. State whether quantity or open/close timing is the likely cause." }
    ]
  },
  {
    code:"D", title:"Work-order closure and material balance", description:"Reconciles declared meters, consumed material, good output, and waste.", alerts:[
      { id:"D01", stage:"Closure meters", title:"Declared meters exceed consumed-reel meters", state:"error", status:"Error · Confirmed", when:"At closure, run meters exceed meters supported by consumed reels.", why:"Production cannot be explained by recorded consumption.", causes:"Missing consumption, wrong run meters, reel data, or closure.", example:"Consumed reels support 30,000 m but closure declares 40,000 m.", detection:"Estimate meters from consumed-reel weight, width, and grammage; compare with declared run meters using tolerance." },
      { id:"D02", stage:"Closure material", title:"Completed OT has delivered reserved reels unconsumed", state:"error", status:"Error · Confirmed", when:"Full planned production completes while a delivered reserved reel remains unconsumed.", why:"A fully completed OT should have used and declared delivered planned material.", causes:"Missing consumption, wrong completion, or wrong reservation quantity.", example:"Four reels were delivered, full production completed, but only three were consumed.", detection:"Require full production, delivered reservations, and an unconsumed delivered reel. Do not apply automatically to truncation." },
      { id:"D03", stage:"Closure mass balance", title:"OT input, good production, and waste do not balance", state:"possible", status:"Possible error or Error", changed:["when","example","detection"], when:"Consumed input cannot be reconciled with good production and waste within an explicit measurement tolerance.", why:"A production, waste, consumption, or weighing record may be missing or wrong.", causes:"Undeclared output/waste, unweighed output, wrong weight, or missing consumption.", example:"Input is 1,500 kg, output is 1,300 kg, and waste is 90 kg. The unexplained 110 kg exceeds measurement tolerance.", detection:"Balance gap = consumed input − good output − waste. Do not subtract undefined process loss. Use scale weights; estimate unweighed output from article_serial, outputs, width, grammage, meters when available, and comparable weighed reels. Estimate waste from quotation ranges/substrate gaps plus historical waste. Recalculate as actual weights arrive and suppress D03 when a specific A or D incident explains the gap." }
    ]
  },
  {
    code:"E", title:"Extrusion candidates", description:"Shared OT/output flow plus extrusion recipes and material containers. All items are new and require review.", candidate:true, alerts:[
      candidate("E01","Readiness","Required resin, additive, or container not ready","Apply A01 to planned extrusion materials and assigned containers.","Use material stock, container assignment, extrusion-container locations, reservations, and dispatch state."),
      candidate("E02","Consumption","Active extrusion OT without material consumption","No resin, additive, or container consumption exists after the initial interval.","Use work-order materials, container link, consumed quantity, and consumed-by-flow. Present as A03 without duplicating it."),
      candidate("E03","Recipe","Consumed formulation differs from OT recipe","Actual ingredient or screw proportions differ materially from the recipe snapshot.","Compare container/material consumption with orden_trabajo_receta_snapshot by ingredient, screw, position, percentage, and configured tolerance."),
      candidate("E04","Container state","Extrusion container state contradicts consumption","A container remains in use when empty, is empty without audit data, or real versus ideal closure quantities diverge.","Use en_uso, esta_vacio, fecha_vaciado, user, and real/ideal consumed and returned quantities."),
      candidate("E05","Output handling","Extrusion output missing, unweighed, or not moved","Produced extrusion output is not represented, weighed, or moved on time.","Apply A04/A05 using produced serial, output, scale, target-operation, and location data; keep one incident per serial."),
      candidate("E06","Closure","Extrusion closure does not balance","Resin/additive input, returns, good output, and waste do not reconcile.","Use container closure quantities, OT material consumption, produced-serial weights, and waste weights; estimate only while unweighed."),
      candidate("E07","Rate","Extrusion production rate is implausible","Output divided by effective OT runtime is too high or low.","Apply C06 using open/close timestamps, pauses, declared meters/kilograms, and extrusion equipment speed.")
    ]
  },
  {
    code:"F", title:"Extrusion-lamination (Exlam) candidates", description:"Multiple substrate layers and bonding material require layer-aware checks. All items are new.", candidate:true, alerts:[
      candidate("F01","Readiness","Required Exlam layers or bonding materials not ready","A required layer, adhesive, or coating is unavailable, unreserved, or undispatched.","Apply A01 to every required input and show the blocking layer/material in one incident."),
      candidate("F02","Consumption","Active Exlam OT without required layer consumption","One or more required layers or bonding materials have no consumption after the initial interval.","Use raw-material type, quantity, reel width, grammage, and OT layer schema."),
      candidate("F03","Layer balance","Exlam layer consumption is out of proportion","Paired layer meters or adhesive/coating quantities disagree beyond tolerance.","Compare substrate linear meters plus laminating-sheet, adhesive-mixture, and curtain grammage; treat as possible until weights support it."),
      candidate("F04","Output handling","Exlam output missing, unweighed, or not moved","Laminate output is not declared, weighed, or moved on time.","Apply A04/A05 to Exlam serial, output, scale, target-operation, and location records."),
      candidate("F05","Closure","Exlam closure meter or mass balance fails","Consumed layers and adhesive/coating do not reconcile with laminate output and waste.","Show every layer separately; use D01 for meters and D03 for combined mass."),
      candidate("F06","Rate","Exlam production rate is implausible","Output per effective runtime is too high or low.","Apply C06 with execution timestamps, pauses, equipment speed, and comparable Exlam OTs.")
    ]
  },
  {
    code:"G", title:"Sealing / bag-making candidates", description:"Reel-to-bag conversion uses bag specifications, packages, bundles, partial bundles, counts, and weights. All items are new.", candidate:true, alerts:[
      candidate("G01","Readiness","Required input reel not ready","The sealing input reel is unavailable, unreserved, or undispatched.","Apply A01 reservation, availability, and dispatch checkpoints."),
      candidate("G02","Consumption","Active sealing OT without reel consumption","The OT has no input-reel consumption after the initial interval.","Apply A03 to the sealing input reel."),
      candidate("G03","Output declaration","Produced bags or bundles were not declared","Consumed reel meters and bag specification imply more output than declared.","Estimate units from useful print length, bag dimensions, planned millares, useful bag weight, and declared output."),
      candidate("G04","Weighing","Produced bundle remains unweighed","A full or partial bundle remains in an unweighed state beyond the threshold.","Use observed, unweighed, and weighed full/partial bundle counters plus scale records."),
      candidate("G05","Package count","Package or bundle count does not reconcile","Full bundles, partial bundles, units, and quantity per package disagree.","Expected units = full bundles × quantity per package + partial units. Keep observed/unweighed/weighed states mutually exclusive."),
      candidate("G06","Yield","Bag count and consumed-reel balance is implausible","Declared bags are inconsistent with consumed reel meters and bag geometry.","Use useful print length, repetitions, bag dimensions, millares, and declared sealing waste."),
      candidate("G07","Waste","Sealing waste is missing, unweighed, or implausible","Sealing waste is absent, overdue for weighing, or outside expected range.","Apply A06/C02 using sealing quotation waste and historical OTs by bag format, substrate, machine, and lot size."),
      candidate("G08","Rate","Sealing production rate is implausible","Declared bags or millares per effective runtime are too high or low.","Use OT open/close timestamps minus pauses and compare with technical-spec/equipment speed and historical sealing OTs."),
      candidate("G09","Closure","Sealing closure does not balance","Input reel, good bags, partial packages, and waste do not reconcile.","Use actual weights when available and technical estimates otherwise; suppress when G03–G08 already explain the gap.")
    ]
  }
];

function candidate(id, stage, title, when, detection) {
  return { id, stage, title, state:"possible", status:"Candidate", isNew:true, when, why:"This condition could expose a physical-versus-digital mismatch in this operation.", causes:"Missing declaration, delayed workflow action, incorrect quantity, or an operation-specific exception requiring review.", example:"Review this candidate against representative live OTs before implementation.", detection };
}

const removed = [
  ["C03 · Specification mismatch", "Removed: output specifications are inherited from the OT and software; operators do not declare them independently."],
  ["C04 · Impossible chronology/value", "Removed: the current workflow prevents production-dependent records before production, and specifications are system-derived."],
  ["C05 · Duplicate serial/event", "Removed: production serial codes are system-generated. The catalog confirms produceArticleSerial and production-series configuration; backend constraint source is not exposed by MCP."]
];

const reviewStorageKey = "emusa-alert-catalog-v3-review";
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

document.querySelector("#alert-index").innerHTML = families.map(f => `<a href="#family-${f.code.toLowerCase()}">${f.code}</a>${f.alerts.map(a => `<a href="#${a.id.toLowerCase()}">${a.id}</a>`).join("")}`).join("") + `<a href="#removed-alerts">Removed</a>`;
document.querySelector("#catalog").innerHTML = families.map(f => `<section class="family-section"><div class="family-heading" id="family-${f.code.toLowerCase()}"><span class="family-code">${f.code}</span><div><h2>${f.title}</h2><p>${f.description}</p></div></div>${f.alerts.map(a => alertMarkup(a,f.code)).join("")}</section>`).join("");
document.querySelector("#removed-list").innerHTML = removed.map(([title,body]) => `<section><strong>${title}</strong><p>${body}</p></section>`).join("");

function loadReviewState() {
  try { return JSON.parse(localStorage.getItem(reviewStorageKey) || "{}"); } catch { return {}; }
}

function setReviewVisual(section, state) {
  section.dataset.reviewState = state;
  const button = section.querySelector(":scope > .review-status");
  if (button) {
    button.textContent = state[0].toUpperCase() + state.slice(1);
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
