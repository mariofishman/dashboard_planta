#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const fail = (message) => {
  process.stderr.write(`test-database-physical-manifest: ${message}\n`);
  process.exit(1);
};

const parseArgs = (values) => {
  const parsed = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith("--") || value === undefined) fail("arguments must be --key value pairs");
    const name = key.slice(2);
    if (parsed[name] !== undefined) fail(`duplicate argument: ${key}`);
    parsed[name] = value;
  }
  return parsed;
};

const requireKeys = (args, keys) => {
  for (const key of keys) if (!args[key]) fail(`missing --${key}`);
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sha256File = (path) => new Promise((resolvePromise, reject) => {
  const hash = createHash("sha256");
  const stream = createReadStream(path);
  stream.on("data", (chunk) => hash.update(chunk));
  stream.on("error", reject);
  stream.on("end", () => resolvePromise(hash.digest("hex")));
});
const isSha = (value) => /^[a-f0-9]{64}$/.test(value);
const safeVolume = (value) => /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(value);
const safeRelativePath = (value) =>
  value === "." ||
  (/^\.\/[a-zA-Z0-9_@.+#-]+(?:\/[a-zA-Z0-9_@.+#-]+)*$/.test(value) && !value.split("/").includes(".."));

const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

const parseInventory = async (path) => {
  const lines = (await readFile(path, "utf8")).trimEnd().split("\n").filter(Boolean);
  if (lines.length === 0) fail("inventory is empty");
  const seen = new Set();
  const entries = lines.map((line, index) => {
    const fields = line.split("\t");
    if (fields.length !== 7) fail(`inventory line ${index + 1} must have seven tab-separated fields`);
    const [type, mode, uidText, gidText, sizeText, digest, relativePath] = fields;
    if (!new Set(["directory", "file"]).has(type)) fail(`inventory line ${index + 1} has unsupported type`);
    if (!/^[0-7]{3,4}$/.test(mode)) fail(`inventory line ${index + 1} has invalid mode`);
    if (!/^\d+$/.test(uidText) || !/^\d+$/.test(gidText) || !/^\d+$/.test(sizeText)) fail(`inventory line ${index + 1} has invalid numeric field`);
    if (type === "file" ? !isSha(digest) : digest !== "-") fail(`inventory line ${index + 1} has invalid digest`);
    if (!safeRelativePath(relativePath)) fail(`inventory line ${index + 1} has unsafe path`);
    if (seen.has(relativePath)) fail(`duplicate inventory path: ${relativePath}`);
    seen.add(relativePath);
    return {
      path: relativePath,
      type,
      mode,
      uid: Number(uidText),
      gid: Number(gidText),
      size: Number(sizeText),
      sha256: digest,
    };
  });
  entries.sort((left, right) => left.path.localeCompare(right.path, "en"));
  if (entries[0]?.path !== "." || entries[0]?.type !== "directory") fail("inventory must contain the root directory");
  return entries;
};

const validateManifest = (manifest) => {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) fail("manifest must be an object");
  const keys = Object.keys(manifest).sort();
  const expected = ["acceptedBaseline", "archive", "createdAt", "formatVersion", "inventory", "mysql", "source"].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) fail("manifest has missing or unexpected fields");
  if (manifest.formatVersion !== 1) fail("unsupported manifest format");
  if (!Number.isInteger(manifest.archive.bytes) || manifest.archive.bytes <= 0 || !isSha(manifest.archive.sha256)) fail("invalid archive authority");
  if (manifest.archive.file !== "template.tar.zst") fail("unexpected archive filename");
  if (!isSha(manifest.source.sqlSha256)) fail("invalid source SQL digest");
  if (!isSha(manifest.acceptedBaseline.schemaMetadataSha256) || !isSha(manifest.acceptedBaseline.tableChecksumsSha256)) fail("invalid accepted baseline digest");
  if (manifest.mysql.binaryLogging !== false || manifest.mysql.innodbRedo !== true || manifest.mysql.localInfile !== false) fail("unsafe MySQL policy in manifest");
  if (!Array.isArray(manifest.inventory) || manifest.inventory.length === 0) fail("manifest inventory is empty");
  const paths = new Set();
  for (const entry of manifest.inventory) {
    if (!safeRelativePath(entry.path) || paths.has(entry.path)) fail("manifest inventory has unsafe or duplicate path");
    paths.add(entry.path);
    if (!new Set(["directory", "file"]).has(entry.type)) fail("manifest inventory has unsupported type");
    if (entry.type === "file" ? !isSha(entry.sha256) : entry.sha256 !== "-") fail("manifest inventory has invalid file digest");
  }
  return manifest;
};

const readJson = async (path, label) => {
  let parsed;
  try { parsed = JSON.parse(await readFile(path, "utf8")); }
  catch { fail(`${label} is not valid JSON`); }
  return parsed;
};

const command = process.argv[2];
const args = parseArgs(process.argv.slice(3));

if (command === "build-template") {
  requireKeys(args, ["inventory", "archive", "output", "mysql-version", "image", "server-args", "source-sha256", "schema-sha256", "checksums-sha256"]);
  for (const key of ["source-sha256", "schema-sha256", "checksums-sha256"]) if (!isSha(args[key])) fail(`invalid --${key}`);
  const inventory = await parseInventory(args.inventory);
  const archiveBytes = (await stat(args.archive)).size;
  const manifest = {
    formatVersion: 1,
    createdAt: new Date().toISOString(),
    source: { sqlSha256: args["source-sha256"] },
    mysql: {
      version: args["mysql-version"],
      image: args.image,
      serverArguments: args["server-args"],
      binaryLogging: false,
      innodbRedo: true,
      localInfile: false,
    },
    archive: { file: basename(args.archive), bytes: archiveBytes, sha256: await sha256File(args.archive) },
    acceptedBaseline: { schemaMetadataSha256: args["schema-sha256"], tableChecksumsSha256: args["checksums-sha256"] },
    inventory,
  };
  validateManifest(manifest);
  await writeFile(args.output, stableJson(manifest), { mode: 0o600 });
  process.stdout.write(`${sha256(stableJson(manifest))}\n`);
} else if (command === "verify-template") {
  requireKeys(args, ["manifest", "archive", "expected-manifest-sha256", "expected-archive-sha256"]);
  if (!isSha(args["expected-manifest-sha256"]) || !isSha(args["expected-archive-sha256"])) fail("invalid expected trust anchor");
  const manifestText = await readFile(args.manifest, "utf8");
  const manifest = validateManifest(JSON.parse(manifestText));
  if (sha256(manifestText) !== args["expected-manifest-sha256"]) fail("manifest differs from external trust anchor");
  if (manifest.archive.sha256 !== args["expected-archive-sha256"]) fail("manifest archive digest differs from external trust anchor");
  if ((await sha256File(args.archive)) !== args["expected-archive-sha256"]) fail("archive differs from external trust anchor");
  if ((await stat(args.archive)).size !== manifest.archive.bytes) fail("archive byte count changed");
  process.stdout.write(`${manifest.archive.sha256}\n`);
} else if (command === "verify-inventory") {
  requireKeys(args, ["manifest", "inventory"]);
  const manifest = validateManifest(await readJson(args.manifest, "manifest"));
  const inventory = await parseInventory(args.inventory);
  if (stableJson(inventory) !== stableJson(manifest.inventory)) fail("extracted inventory differs from the certified template");
  process.stdout.write(`${inventory.length}\n`);
} else if (command === "write-seal") {
  requireKeys(args, ["output", "volume", "source", "manifest-sha256", "archive-sha256", "validation-sha256", "shutdown-at"]);
  if (!safeVolume(args.volume)) fail("unsafe volume name");
  if (!new Set(["physical-template", "protected-sql"]).has(args.source)) fail("invalid standby source");
  for (const key of ["manifest-sha256", "archive-sha256", "validation-sha256"]) if (!isSha(args[key])) fail(`invalid --${key}`);
  const seal = {
    formatVersion: 1,
    volume: args.volume,
    source: args.source,
    manifestSha256: args["manifest-sha256"],
    archiveSha256: args["archive-sha256"],
    validationSha256: args["validation-sha256"],
    shutdownAt: args["shutdown-at"],
    sealedAt: new Date().toISOString(),
  };
  await writeFile(args.output, stableJson(seal), { mode: 0o600 });
} else if (command === "write-certification") {
  requireKeys(args, ["output", "manifest-sha256", "archive-sha256", "validation-sha256", "attempt"]);
  for (const key of ["manifest-sha256", "archive-sha256", "validation-sha256"]) if (!isSha(args[key])) fail(`invalid --${key}`);
  if (!/^[a-zA-Z0-9_.-]+$/.test(args.attempt)) fail("unsafe attempt identifier");
  const certification = {
    formatVersion: 1,
    manifestSha256: args["manifest-sha256"],
    archiveSha256: args["archive-sha256"],
    validationSha256: args["validation-sha256"],
    attempt: args.attempt,
    certifiedAt: new Date().toISOString(),
  };
  await writeFile(args.output, stableJson(certification), { mode: 0o600 });
} else if (command === "verify-certification") {
  requireKeys(args, ["certification", "expected-certification-sha256", "expected-manifest-sha256", "expected-archive-sha256"]);
  for (const key of ["expected-certification-sha256", "expected-manifest-sha256", "expected-archive-sha256"]) if (!isSha(args[key])) fail(`invalid --${key}`);
  const text = await readFile(args.certification, "utf8");
  const certification = await readJson(args.certification, "certification");
  const expectedKeys = ["archiveSha256", "attempt", "certifiedAt", "formatVersion", "manifestSha256", "validationSha256"].sort();
  if (JSON.stringify(Object.keys(certification).sort()) !== JSON.stringify(expectedKeys) || certification.formatVersion !== 1) fail("certification has missing or unexpected fields");
  if (sha256(text) !== args["expected-certification-sha256"]) fail("certification differs from external trust anchor");
  if (certification.manifestSha256 !== args["expected-manifest-sha256"] || certification.archiveSha256 !== args["expected-archive-sha256"] || !isSha(certification.validationSha256)) fail("certification authority differs from expected baseline");
  process.stdout.write(`${certification.validationSha256}\n`);
} else if (command === "seal-field") {
  requireKeys(args, ["seal", "field", "expected-manifest-sha256", "expected-archive-sha256"]);
  if (!new Set(["volume", "source", "validationSha256", "shutdownAt", "sealedAt"]).has(args.field)) fail("field is not allowed");
  const seal = await readJson(args.seal, "seal");
  const expectedKeys = ["archiveSha256", "formatVersion", "manifestSha256", "sealedAt", "shutdownAt", "source", "validationSha256", "volume"].sort();
  if (JSON.stringify(Object.keys(seal).sort()) !== JSON.stringify(expectedKeys) || seal.formatVersion !== 1) fail("seal has missing or unexpected fields");
  if (!safeVolume(seal.volume) || !isSha(seal.validationSha256) || !new Set(["physical-template", "protected-sql"]).has(seal.source)) fail("seal has invalid identity");
  if (seal.manifestSha256 !== args["expected-manifest-sha256"] || seal.archiveSha256 !== args["expected-archive-sha256"]) fail("seal differs from external trust anchors");
  process.stdout.write(`${seal[args.field]}\n`);
} else {
  fail("usage: build-template|verify-template|verify-inventory|write-certification|verify-certification|write-seal|seal-field");
}
