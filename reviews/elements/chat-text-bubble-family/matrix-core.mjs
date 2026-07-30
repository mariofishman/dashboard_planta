const clone = (value) => JSON.parse(JSON.stringify(value));

export function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "decision";
}

export function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== "object") return ["Config must be an object."];
  if (!config.id) errors.push("Config requires id.");
  if (!config.title) errors.push("Config requires title.");
  if (!Array.isArray(config.columns) || config.columns.length < 2) {
    errors.push("Config requires at least two columns.");
  } else if (config.columns[0]?.id !== "current") {
    errors.push("The first column must use id current.");
  } else {
    const referenceIndex = config.columns.findIndex((column) => column.id === "reference");
    if (referenceIndex > 0 && referenceIndex !== 1) errors.push("The reference column must immediately follow current.");
    if (referenceIndex < 0 && config.columns.length !== 5) errors.push("Without a reference, provide current plus exactly four generated columns.");
    const generatedColumns = config.columns.filter((column) => column.provenance === "generated");
    if (referenceIndex === 1 && ![0, 4].includes(generatedColumns.length)) {
      errors.push("With a reference, provide either no generated columns or exactly four generated columns.");
    }
    if (generatedColumns.some((column) => column.optional !== true) && referenceIndex === 1) {
      errors.push("Generated columns beside a reference must be optional.");
    }
  }
  if (!Array.isArray(config.rows) || !config.rows.length) errors.push("Config requires rows.");

  const columnIds = new Set((config.columns || []).map((column) => column.id));
  const rowIds = new Set();
  const propertyOwners = new Map();
  for (const row of config.rows || []) {
    if (!row.id || rowIds.has(row.id)) errors.push(`Row id is missing or duplicated: ${row.id || "(missing)"}.`);
    rowIds.add(row.id);
    for (const columnId of columnIds) {
      const option = row.options?.[columnId];
      if (!option) {
        errors.push(`Row ${row.id} lacks option for column ${columnId}.`);
        continue;
      }
      for (const key of Object.keys(option.patch || {})) {
        if (!key.startsWith("--")) errors.push(`Option ${option.id} has unsafe patch key ${key}.`);
        const owner = propertyOwners.get(key);
        if (owner && owner !== row.id) errors.push(`CSS property ${key} is owned by both ${owner} and ${row.id}.`);
        propertyOwners.set(key, row.id);
      }
    }
    const optionIds = Object.values(row.options || {}).map((option) => option.id);
    if (new Set(optionIds).size !== optionIds.length) errors.push(`Row ${row.id} has duplicate option ids.`);
    if (!optionIds.includes(config.selections?.[row.id])) errors.push(`Row ${row.id} has no valid initial selection.`);
  }
  return errors;
}

export function createState(config) {
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.join("\n"));
  return { config: clone(config), selections: clone(config.selections), notices: [] };
}

export function selectOption(state, rowId, optionId) {
  const row = state.config.rows.find((candidate) => candidate.id === rowId);
  if (!row) throw new Error(`Unknown row: ${rowId}`);
  if (!Object.values(row.options).some((option) => option.id === optionId)) {
    throw new Error(`Unknown option ${optionId} for row ${rowId}`);
  }
  return { ...state, selections: { ...state.selections, [rowId]: optionId }, notices: [] };
}

export function reconcileSelections(state, savedSelections = {}) {
  const selections = { ...state.selections };
  for (const row of state.config.rows) {
    const saved = savedSelections[row.id];
    if (saved && Object.values(row.options).some((option) => option.id === saved)) selections[row.id] = saved;
  }
  return { ...state, selections, notices: [] };
}

export function configSignature(config) {
  return JSON.stringify((config.rows || []).map((row) => [row.id, Object.values(row.options || {}).map((option) => option.id)]));
}

export function selectedOption(state, row) {
  return Object.values(row.options).find((option) => option.id === state.selections[row.id]);
}

export function composePatch(state) {
  return state.config.rows.reduce((patch, row) => {
    const option = selectedOption(state, row);
    return Object.assign(patch, option?.patch || {});
  }, {});
}

export function buildSpecification(state) {
  const columns = new Map(state.config.columns.map((column) => [column.id, column]));
  return state.config.rows.map((row) => {
    const option = selectedOption(state, row);
    const columnId = Object.entries(row.options).find(([, candidate]) => candidate.id === option?.id)?.[0];
    return {
      rowId: row.id,
      decision: row.label,
      option: option?.label || "Missing",
      value: option?.value || "Unspecified",
      provenance: option?.provenance || columns.get(columnId)?.provenance || "unknown",
    };
  });
}

function findRow(rows, token) {
  const normalized = token.trim().toLowerCase();
  return rows.find((row) => row.id.toLowerCase() === normalized || row.label.toLowerCase() === normalized);
}

function uniqueId(rows, label) {
  const base = slugify(label);
  let id = base;
  let suffix = 2;
  while (rows.some((row) => row.id === id)) id = `${base}-${suffix++}`;
  return id;
}

function genericRow(config, rows, label) {
  const id = uniqueId(rows, label);
  const options = Object.fromEntries(config.columns.map((column) => [
    column.id,
    {
      id: `${id}-${column.id}`,
      label: column.id === "current" ? "Not observed" : "Needs design",
      value: "Requires Codex regeneration",
      patch: {},
    },
  ]));
  return { id, label: label.trim(), description: "Added locally; define evidence and distinct options in Codex.", options };
}

function parseCommand(line) {
  let match;
  if ((match = line.match(/^(?:add|missing)\s+(.+)$/i))) return { type: "add", label: match[1].trim() };
  if ((match = line.match(/^remove\s+(.+)$/i))) return { type: "remove", target: match[1].trim() };
  if ((match = line.match(/^rename\s+(.+?)\s+to\s+(.+)$/i))) return { type: "rename", target: match[1].trim(), label: match[2].trim() };
  if ((match = line.match(/^split\s+(.+?)\s+into\s+(.+)$/i))) {
    return { type: "split", target: match[1].trim(), labels: match[2].split(",").map((part) => part.trim()).filter(Boolean) };
  }
  if ((match = line.match(/^merge\s+(.+?)\s+as\s+(.+)$/i))) {
    return { type: "merge", targets: match[1].split(",").map((part) => part.trim()).filter(Boolean), label: match[2].trim() };
  }
  throw new Error(`Unsupported request: “${line}”. Requires Codex.`);
}

export function applyCommands(state, input) {
  const lines = input.split(/\n|;/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error("Enter at least one row command.");

  const next = clone(state);
  next.notices = [];
  for (const line of lines) {
    const command = parseCommand(line);
    const rows = next.config.rows;

    if (command.type === "add") {
      const row = genericRow(next.config, rows, command.label);
      rows.push(row);
      next.selections[row.id] = row.options.current.id;
      next.notices.push(`Added ${row.label}; options require Codex regeneration.`);
      continue;
    }

    if (command.type === "remove") {
      const row = findRow(rows, command.target);
      if (!row) throw new Error(`Cannot remove unknown row: ${command.target}`);
      next.config.rows = rows.filter((candidate) => candidate.id !== row.id);
      delete next.selections[row.id];
      next.notices.push(`Removed ${row.label}.`);
      continue;
    }

    if (command.type === "rename") {
      const row = findRow(rows, command.target);
      if (!row) throw new Error(`Cannot rename unknown row: ${command.target}`);
      row.label = command.label;
      next.notices.push(`Renamed ${command.target} to ${command.label}; selection preserved.`);
      continue;
    }

    if (command.type === "split") {
      const row = findRow(rows, command.target);
      if (!row) throw new Error(`Cannot split unknown row: ${command.target}`);
      if (command.labels.length < 2) throw new Error("Split requires at least two comma-separated row names.");
      if (new Set(command.labels.map((label) => label.toLowerCase())).size !== command.labels.length) {
        throw new Error("Split row names must be unique.");
      }
      const existingLabels = new Set(rows.filter((candidate) => candidate.id !== row.id).map((candidate) => candidate.label.toLowerCase()));
      if (command.labels.some((label) => existingLabels.has(label.toLowerCase()))) {
        throw new Error("Split row names must not duplicate existing row labels.");
      }
      const index = rows.indexOf(row);
      const allocatedRows = rows.filter((candidate) => candidate.id !== row.id);
      const selectedColumn = Object.entries(row.options).find(([, option]) => option.id === next.selections[row.id])?.[0] || "current";
      const splitRows = command.labels.map((label, labelIndex) => {
        const id = uniqueId(allocatedRows, label);
        allocatedRows.push({ id });
        const options = Object.fromEntries(Object.entries(row.options).map(([columnId, option]) => [
          columnId,
          labelIndex === 0
            ? { ...clone(option), id: `${id}-${columnId}` }
            : { id: `${id}-${columnId}`, label: option.label, value: "Requires Codex regeneration", patch: {} },
        ]));
        next.selections[id] = options[selectedColumn].id;
        return { ...clone(row), id, label, options };
      });
      rows.splice(index, 1, ...splitRows);
      delete next.selections[row.id];
      next.notices.push(`Split ${row.label}; retained its patch on ${splitRows[0].label}. Other split rows require Codex regeneration.`);
      continue;
    }

    if (command.type === "merge") {
      if (command.targets.length < 2) throw new Error("Merge requires at least two comma-separated rows.");
      const sourceRows = command.targets.map((target) => findRow(rows, target));
      if (sourceRows.some((row) => !row)) throw new Error(`Cannot merge unknown row in: ${command.targets.join(", ")}`);
      const id = uniqueId(rows, command.label);
      const options = Object.fromEntries(next.config.columns.map((column) => {
        const sourceOptions = sourceRows.map((row) => row.options[column.id]);
        return [column.id, {
          id: `${id}-${column.id}`,
          label: sourceOptions.map((option) => option.label).join(" + "),
          value: sourceOptions.map((option) => option.value).join("; "),
          patch: Object.assign({}, ...sourceOptions.map((option) => option.patch || {})),
        }];
      }));
      const selectedColumns = sourceRows.map((row) => Object.entries(row.options).find(([, option]) => option.id === next.selections[row.id])?.[0]);
      const retainedColumn = selectedColumns.every((column) => column === selectedColumns[0]) ? selectedColumns[0] : selectedColumns[0];
      const firstIndex = Math.min(...sourceRows.map((row) => rows.indexOf(row)));
      next.config.rows = rows.filter((row) => !sourceRows.includes(row));
      next.config.rows.splice(firstIndex, 0, { id, label: command.label, description: "Merged locally; verify combined ownership in Codex.", options });
      sourceRows.forEach((row) => delete next.selections[row.id]);
      next.selections[id] = options[retainedColumn || "current"].id;
      next.notices.push(selectedColumns.every((column) => column === selectedColumns[0])
        ? `Merged ${command.targets.join(", ")}; common selection preserved.`
        : `Merged ${command.targets.join(", ")}; selections conflicted, so ${sourceRows[0].label}'s column was retained.`);
    }
  }
  const errors = validateConfig({ ...next.config, selections: next.selections });
  if (errors.length) throw new Error(errors.join("\n"));
  return next;
}
