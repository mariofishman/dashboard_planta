const families = [
  {
    code: "A",
    title: "Material, inventory, and production-data registration",
    description: "Current scope: printing, lamination, adhesive lamination, and cutting.",
    alerts: [
      {
        id: "A01", title: "Required material not ready before OT start", stage: "Readiness and dispatch", state: "upcoming", status: "Por vencer, then Error",
        when: "At 60 minutes before planned OT start, required material is unavailable in the warehouse or has not been reserved. At 30 minutes before start, the same incident is updated if the material has not been dispatched.",
        why: "The OT is at risk of starting without the required material at the machine.",
        causes: "Reservation negligence; warehouse stock unavailable; supplier delivery pending after purchasing; or reserved material not dispatched by warehouse.",
        example: "OT 151200.1 starts at 10:00. At 09:00 one substrate is unavailable and unreserved. At 09:30 the incident says: Not dispatched because material is not reserved and not available in the warehouse.",
        detection: "At planned start minus 60 minutes, evaluate required materials, reservations, warehouse availability, and open purchase or supplier-delivery status. At planned start minus 30 minutes, add dispatch status. Maintain one incident per OT and required material.",
        note: "Deduplication: former A01 and A02 are one incident. Later evidence changes the reason; it does not create another alert."
      },
      {
        id: "A02", title: "Material flow not received within 30 minutes", stage: "Transit and receipt", state: "error", status: "Error",
        when: "A sent material flow remains in transit without digital receipt for more than 30 minutes.",
        why: "The material may have arrived physically while the receiver failed to reproduce that action in EMUSA Soft, leaving the digital location incorrect.",
        causes: "Physical delivery occurred but the operator did not receive it digitally, or the physical movement itself is delayed. A wrong destination is not a valid cause for OT-reserved material.",
        example: "A reserved reel is sent to P15 at 09:00 and physically arrives, but at 09:31 it remains En tránsito because the operator has not recorded receipt.",
        detection: "Find material-flow details with sent or in-transit status, no receivedAt, and current time minus sent time greater than 30 minutes. Show whether the flow is linked to an OT or is a relocation without a reservation.",
        note: "ERP catalog structure ties pre-reservation to a target OT and material-flow detail to workOrderId, workOrderMaterialId, origin, destination, receiver, and receivedAt."
      },
      {
        id: "A03", title: "Active OT without consumption after 15 minutes", stage: "Consumption", state: "error", status: "Error",
        when: "An OT has been active for 15 minutes without a first consumption declaration.",
        why: "After 15 minutes of setup or operation, the first raw-material reel being used should already be represented digitally.",
        causes: "The operator started the OT, spent the initial setup period preparing the machine, and then failed to declare the first reel being used.",
        example: "OT 151087.3 starts at 09:00. At 09:15 it remains active with zero consumed reels.",
        detection: "Require OT active, current time minus actual start at least 15 minutes, and consumption count equal to zero. Production declarations may support the same incident but must not create a duplicate."
      },
      {
        id: "A04", title: "Possible undeclared produced reel", stage: "Production declaration", state: "possible", status: "Possible error",
        when: "The estimated material still unaccounted for on the rewinder exceeds the maximum mass the rewinder can physically hold.",
        why: "Enough raw material has been consumed that another finished reel should already have been declared.",
        causes: "The operator forgot or delayed a production declaration, or the statistical output-weight assumptions are inaccurate.",
        example: "Input consumed: 1,500 kg. Estimated declared output: 850 kg. Waste: 100 kg. Allowed loss: 50 kg. Estimated remaining mass: 500 kg. If the rewinder limit is 400 kg, a produced reel may be missing.",
        detection: "Estimated remaining mass equals consumed input mass minus estimated mass of declared output minus declared or estimated waste mass minus allowed process loss. Use actual weights when available; estimate unweighed output from meters, width, basis weight, and comparable historical reels. Warn when remaining mass exceeds rewinder capacity plus tolerance.",
        note: "No PLC completion signal exists in version 1. This is an inferred warning, recalculated as actual weights arrive."
      },
      {
        id: "A05", title: "Produced reel not weighed or not moved from the machine", stage: "Post-production handling", state: "upcoming", status: "Por vencer, then Error",
        when: "A declared reel has no weight within 30 minutes, or a reel from a finished OT remains at the machine for more than 30 minutes instead of being sent to its next OT or warehouse.",
        why: "Without weight, EMUSA Soft cannot calculate cost or add the correct quantity to inventory. After OT completion, the reel must also leave the machine and enter its next workflow.",
        causes: "Process-team delay, missed weighing, missing scale record, failure to initiate movement, or failure to record movement.",
        example: "CU-98421 was declared at 10:00. At 10:31 it has no weight and remains at P15. One incident shows reasons not_weighed and still_at_machine.",
        detection: "Maintain one incident per produced reel. Add not_weighed after 30 minutes without a scale record. Add still_at_machine when the source OT is finished, 30 minutes have elapsed, and no movement to the correct warehouse or next OT exists. If movement begins but is not received in 30 minutes, use A02."
      },
      {
        id: "A06", title: "Waste missing or not weighed", stage: "Waste registration and weighing", state: "possible", status: "Possible error or Error",
        when: "A declared waste bag remains unweighed beyond the configured interval, or OT balance and historical expectations indicate that waste should exist but sufficient waste was not declared.",
        why: "Missing or unweighed waste prevents correct material balance, costing, and inventory reconciliation.",
        causes: "Waste was produced but not declared; a declared bag was not weighed; the category is wrong; or the statistical expectation does not fit this run.",
        example: "Comparable printing OTs normally produce 70–100 kg of waste. This OT closes with 5 kg declared while input and good-output estimates leave an unexplained 80 kg gap.",
        detection: "Use two paths in one incident: declared waste without a scale record after the weighing interval, or closure balance indicating likely missing waste. Compare actual or estimated output, declared waste, expected statistical waste by operation and OT size, allowed loss, and consumed input.",
        note: "If D03 already represents the same balance gap, attach possible_waste_not_declared to D03 instead of creating a duplicate alert."
      }
    ]
  },
  {
    code: "B", title: "Production-plan adherence and machine activity", description: "Separate from inventory accuracy: these alerts protect the planner's current recorded schedule.",
    alerts: [
      { id:"B01", title:"OT started outside the latest approved plan sequence", stage:"Sequence", state:"error", status:"Error", when:"An operator starts an OT that is not next in the latest approved sequence. The factory floor may reorganize the planner's plan, but the change must be recorded before start.", why:"The machine is no longer following the current recorded production plan created by the planner and subsequently adjusted on the floor when necessary.", causes:"Wrong OT selected; disorganization; previous OT material did not arrive; or an OT was skipped without updating the plan.", example:"The plan lists 151099.1 before 151104.1. Material is late, so the operator starts 151104.1 without recording the sequence change.", detection:"At actual OT start, compare the started OT with the first pending OT in the latest recorded plan for that machine. Do not alert if an authorized floor update changed the sequence before start." },
      { id:"B02", title:"Planned OT has not started on time", stage:"Planned start", state:"error", status:"Error", when:"The planned start time has arrived but the expected OT has not started and the plan has not been updated.", why:"The recorded plan and actual factory execution have diverged.", causes:"Setup delay, missing material, unavailable operator, machine problem, or an unrecorded plan change.", example:"OT 151230.1 should start on P15 at 16:00, but at 16:01 it has not started and no revised plan exists.", detection:"Find the first pending OT whose planned start is in the past. Alert when it has no actual start and no approved rescheduling event. Link any specific material or machine incident as its reason." },
      { id:"B03", title:"Machine has no active OT for more than 30 minutes", stage:"Machine activity", state:"error", status:"Error", when:"A machine expected to be producing has no active OT for more than 30 minutes.", why:"Planned production time is being lost without a corresponding active work order.", causes:"Disorganization, unrecorded stoppage, missing material, operator delay, maintenance, or a plan that was not updated.", example:"P09 is scheduled to produce during the shift but has no active OT between 14:00 and 14:31.", detection:"Require that the machine is expected to operate, has no active OT, and has remained in that state for more than 30 minutes. Exclude recorded maintenance, planned shutdown, approved pause, and no-production schedule periods." }
    ]
  },
  {
    code: "C", title: "Statistical and physical plausibility", description: "Detects values that violate physical limits, OT specifications, or reliable historical ranges.",
    alerts: [
      { id:"C01", title:"Produced reel weight outside the plausible range", stage:"Weight plausibility", state:"possible", status:"Possible error", when:"A produced reel's recorded weight is below the expected minimum or above the expected maximum for comparable production.", why:"An implausible weight may corrupt inventory quantity, cost, yield, and downstream calculations.", causes:"Typing error, wrong scale unit, wrong barcode, scale problem, or unusual production requiring review.", example:"A single reel is recorded as 3,000 kg when comparable reels normally fall between 250 and 600 kg.", detection:"Compare net weight with hard physical limits and statistical percentiles for the same operation, machine, product family, width, basis weight, and OT size. Hard-limit violations are errors; statistical outliers are possible errors." },
      { id:"C02", title:"Waste amount outside the plausible range", stage:"Waste plausibility", state:"possible", status:"Possible error", when:"Declared waste weight or percentage is materially below or above the expected range for comparable OTs.", why:"Very low waste may indicate missing declarations; very high waste may indicate a wrong value or a real production problem.", causes:"Missing bag, incorrect weight, wrong category, unusual setup loss, quality problem, or atypical run conditions.", example:"Comparable 20,000-meter printing OTs normally produce 60–100 kg of waste, but the OT declares 5 kg or 450 kg.", detection:"Build expected minimum and maximum waste by operation, machine, product family, OT-size band, width, basis weight, setup pattern, and historical distribution." },
      { id:"C03", title:"Declared reel dimensions do not match the OT specification", stage:"Specification", state:"possible", status:"Error or Possible error", when:"A produced reel's width, basis weight, material, or defining characteristic differs from the OT specification beyond tolerance.", why:"The reel may be mislabeled, associated with the wrong OT, or represented incorrectly in inventory.", causes:"Wrong barcode, typing error, wrong OT, master-data problem, or approved substitution not recorded.", example:"The OT specifies 1,200 mm width, but the output reel is recorded as 1,020 mm.", detection:"Compare produced-reel fields with the OT output specification and tolerances. Treat approved substitutions separately." },
      { id:"C04", title:"Impossible numeric or chronological value", stage:"Hard validation", state:"error", status:"Error", when:"A quantity is zero or negative when physically impossible, or timestamps occur in an impossible order.", why:"These values cannot represent the physical process and will corrupt calculations.", causes:"Typing error, unit conversion error, integration defect, or incorrect device time.", example:"A reel has negative net weight, or weighing occurs before its production declaration.", detection:"Apply field-level hard constraints and event-order rules such as production before movement, weighing, and downstream receipt, allowing only explicitly supported exceptions." },
      { id:"C05", title:"Duplicate reel or duplicate operational event", stage:"Uniqueness", state:"error", status:"Error", when:"The same unique code or physical event is recorded more than once where only one record should exist.", why:"Duplicates can double inventory, weight, consumption, production, or cost.", causes:"Repeated scan, retry after slow response, duplicate integration event, or reused barcode.", example:"CU-98421 receives two production declarations or two active weighing records.", detection:"Monitor uniqueness by reel code and event type. Detect repeated events with the same source, OT, reel, quantity, and near-identical timestamp." },
      { id:"C06", title:"Declared production rate outside the machine's plausible range", stage:"Rate plausibility", state:"possible", status:"Possible error", when:"Declared meters or kilograms divided by runtime imply a rate outside the machine's physical or historical range.", why:"The quantity, timestamps, or machine association may be incorrect.", causes:"Extra zero, wrong unit, wrong start or end time, wrong machine, or exceptional production requiring review.", example:"A press normally runs below 350 m/min, but the recorded OT implies 1,200 m/min.", detection:"Compare declared production divided by effective runtime with machine hard limits and statistical ranges by product and setup. Exclude recorded pauses and setup time according to the final runtime definition." }
    ]
  },
  {
    code: "D", title: "Work-order closure and material balance", description: "Reconciles declared meters, delivered and consumed material, good output, waste, and process loss.",
    alerts: [
      { id:"D01", title:"Declared meters exceed consumed-reel meters", stage:"Closure meters", state:"error", status:"Error · Confirmed", when:"At closure, declared run meters materially exceed the estimated meters provided by consumed reels.", why:"The declared production cannot be explained by recorded consumption.", causes:"Missing consumption declaration, incorrect run meters, incorrect reel data, or incorrect closure.", example:"Consumed reels support approximately 30,000 m, but the operator declares 40,000 m.", detection:"Estimate meters in every consumed reel from weight, width, and basis weight. Sum them and compare them with declared run meters. Alert when the difference exceeds tolerance. This is the primary closure rule." },
      { id:"D02", title:"Completed OT has delivered reserved reels unconsumed", stage:"Closure material", state:"error", status:"Error · Confirmed", when:"An OT completes all planned production, but a reserved reel delivered to the machine remains unconsumed.", why:"If full production was completed, the delivered reserved material should have been used and declared.", causes:"Missing consumption declaration, incorrect completion status, or incorrect reservation quantity.", example:"Four reels were reserved and delivered; full production was completed, but only three were consumed.", detection:"Require full planned production completed, reserved reels delivered to the machine, and delivered reserved reels minus consumed reels is not empty. Do not apply automatically to truncated OTs." },
      { id:"D03", title:"OT input, good production, and waste do not balance", stage:"Closure mass balance", state:"possible", status:"Possible error or Error", when:"At closure, consumed input mass cannot be reconciled with good production, waste, and allowed process loss.", why:"One or more production, waste, consumption, or weighing records may be missing or incorrect.", causes:"Undeclared output, undeclared waste, unweighed output, wrong weight, missing consumption, or statistical assumptions that do not fit the OT.", example:"Input is 1,500 kg; actual and estimated good production is 1,260 kg; waste is 90 kg; allowed loss is 30 kg. The unexplained 120 kg exceeds tolerance.", detection:"Balance gap equals consumed input mass minus good-output mass minus waste mass minus allowed process loss. Use actual weights when available. Estimate unweighed output from meters, width, basis weight, and comparable reels; use expected waste by operation and OT-size band as supporting evidence. Recalculate when actual weights arrive.", note:"If evidence identifies a specific A03, A04, A05, A06, D01, or D02 cause, enrich that incident and suppress a duplicate D03 alert." }
    ]
  }
];

const futureFamilies = [
  ["E · Extrusion", "Resin and additive inputs, silos or containers, formulation consistency, extrusion output, trim waste, and extrusion-specific balance."],
  ["F · Exlam", "Paired or multi-layer inputs, coating or bonding materials, layer sequence, curing requirements, and Exlam-specific output and balance."],
  ["G · Sealing / bag making", "Reel-to-bag conversion, unit and bundle counts, partial packages, sealing waste, packaging declarations, and count-versus-weight reconciliation."]
];

const excluded = [
  ["Consumed reel was not reserved for the OT", "Impossible: EMUSA Soft prevents this consumption."],
  ["Reserved OT material sent to an arbitrary destination", "The workflow derives the OT/material relationship and destination. Relocation without a reservation is a separate non-OT flow."],
  ["Production declared while an active OT has no consumption", "Duplicate: A03 already covers the active OT without consumption."],
  ["Rewinder completion detected directly", "No PLC or machine-completion signal currently exists."],
  ["Physical label was not printed", "Not observable without printer acknowledgment or print-job failure data."],
  ["Scale discovers an undeclared reel", "Useful as late reconciliation evidence, but too late to be the primary warning."],
  ["Truncated OT", "Normal production condition; not inherently a digital-versus-physical mismatch."],
  ["Incomplete reel used downstream", "Removed as a separate alert. Upstream registration, weighing, movement, and balance controls should prevent it."]
];

function alertMarkup(alert, familyCode) {
  return `
    <article class="alert-card family-${familyCode.toLowerCase()} state-${alert.state}" id="${alert.id.toLowerCase()}" aria-labelledby="${alert.id.toLowerCase()}-title">
      <div class="card-heading">
        <div><span class="alert-id">${alert.id} · ${alert.stage}</span><h2 id="${alert.id.toLowerCase()}-title">${alert.title}</h2></div>
        <span class="state-pill">${alert.status}</span>
      </div>
      <div class="definition-grid">
        <section><h3>When it happens</h3><p>${alert.when}</p></section>
        <section><h3>Why the alert exists</h3><p>${alert.why}</p></section>
        <section><h3>Possible causes</h3><p>${alert.causes}</p></section>
        <section><h3>Example</h3><p>${alert.example}</p></section>
      </div>
      <section class="detection-rule"><span>Detection indicators and algorithm</span><p>${alert.detection}</p></section>
      ${alert.note ? `<p class="rule-note"><strong>Incident rule:</strong> ${alert.note}</p>` : ""}
    </article>`;
}

document.querySelector("#alert-index").innerHTML = families.map(family => `<a href="#family-${family.code.toLowerCase()}">${family.code}</a>${family.alerts.map(alert => `<a href="#${alert.id.toLowerCase()}">${alert.id}</a>`).join("")}`).join("") + `<a href="#future">E–G</a><a href="#excluded">Excluded</a>`;

document.querySelector("#catalog").innerHTML = families.map(family => `
  <section class="family-section" aria-labelledby="family-${family.code.toLowerCase()}-title">
    <div class="family-heading" id="family-${family.code.toLowerCase()}">
      <span class="family-code">${family.code}</span>
      <div><h2 id="family-${family.code.toLowerCase()}-title">${family.title}</h2><p>${family.description}</p></div>
    </div>
    ${family.alerts.map(alert => alertMarkup(alert, family.code)).join("")}
  </section>
`).join("");

document.querySelector("#future-grid").innerHTML = futureFamilies.map(([title, body]) => `<section><strong>${title}</strong><p>${body}</p></section>`).join("");
document.querySelector("#excluded-list").innerHTML = excluded.map(([rule, reason]) => `<section><strong>${rule}</strong><p>${reason}</p></section>`).join("");

