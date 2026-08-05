import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { createHash } from "node:crypto";

const script = resolve("scripts/test-database-physical-manifest.mjs");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const fixedDigest = digest("fixed");

const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), "physical-manifest-"));
  const archive = join(root, "template.tar.zst");
  const inventory = join(root, "inventory.tsv");
  const manifest = join(root, "manifest.json");
  writeFileSync(archive, "physical archive fixture");
  writeFileSync(inventory, `directory\t700\t999\t999\t0\t-\t.\nfile\t660\t999\t999\t4\t${digest("data")}\t./file\n`);
  return { root, archive, inventory, manifest };
};

const build = (paths) => execFileSync(process.execPath, [
  script, "build-template",
  "--inventory", paths.inventory,
  "--archive", paths.archive,
  "--output", paths.manifest,
  "--mysql-version", "8.0.43",
  "--image", "mysql@sha256:test",
  "--server-args", "--skip-log-bin",
  "--source-sha256", fixedDigest,
  "--schema-sha256", fixedDigest,
  "--checksums-sha256", fixedDigest,
], { encoding: "utf8" }).trim();

test("builds and verifies an externally anchored template", () => {
  const paths = fixture();
  const manifestDigest = build(paths);
  const archiveDigest = digest(readFileSync(paths.archive));
  const output = execFileSync(process.execPath, [
    script, "verify-template",
    "--manifest", paths.manifest,
    "--archive", paths.archive,
    "--expected-manifest-sha256", manifestDigest,
    "--expected-archive-sha256", archiveDigest,
  ], { encoding: "utf8" }).trim();
  assert.equal(output, archiveDigest);
});

test("rejects an archive changed after certification", () => {
  const paths = fixture();
  const manifestDigest = build(paths);
  const archiveDigest = digest(readFileSync(paths.archive));
  writeFileSync(paths.archive, "changed");
  const result = spawnSync(process.execPath, [
    script, "verify-template",
    "--manifest", paths.manifest,
    "--archive", paths.archive,
    "--expected-manifest-sha256", manifestDigest,
    "--expected-archive-sha256", archiveDigest,
  ], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /archive differs|byte count changed/);
});

test("rejects unsafe inventory paths", () => {
  const paths = fixture();
  writeFileSync(paths.inventory, `directory\t700\t999\t999\t0\t-\t.\nfile\t660\t999\t999\t4\t${fixedDigest}\t../escape\n`);
  const result = spawnSync(process.execPath, [
    script, "build-template",
    "--inventory", paths.inventory,
    "--archive", paths.archive,
    "--output", paths.manifest,
    "--mysql-version", "8.0.43",
    "--image", "mysql@sha256:test",
    "--server-args", "--skip-log-bin",
    "--source-sha256", fixedDigest,
    "--schema-sha256", fixedDigest,
    "--checksums-sha256", fixedDigest,
  ], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsafe path/);
});

test("writes and reads only externally anchored seal fields", () => {
  const paths = fixture();
  const seal = join(paths.root, "seal.json");
  execFileSync(process.execPath, [
    script, "write-seal",
    "--output", seal,
    "--volume", "monitor-test-standby-1",
    "--source", "physical-template",
    "--manifest-sha256", fixedDigest,
    "--archive-sha256", fixedDigest,
    "--validation-sha256", fixedDigest,
    "--shutdown-at", "2026-08-02T00:00:00Z",
  ]);
  const volume = execFileSync(process.execPath, [
    script, "seal-field",
    "--seal", seal,
    "--field", "volume",
    "--expected-manifest-sha256", fixedDigest,
    "--expected-archive-sha256", fixedDigest,
  ], { encoding: "utf8" }).trim();
  assert.equal(volume, "monitor-test-standby-1");
});

test("verifies certification against an external digest", () => {
  const paths = fixture();
  const certification = join(paths.root, "certification.json");
  execFileSync(process.execPath, [
    script, "write-certification",
    "--output", certification,
    "--manifest-sha256", fixedDigest,
    "--archive-sha256", fixedDigest,
    "--validation-sha256", fixedDigest,
    "--attempt", "attempt-1",
  ]);
  const certificationDigest = digest(readFileSync(certification));
  const validationDigest = execFileSync(process.execPath, [
    script, "verify-certification",
    "--certification", certification,
    "--expected-certification-sha256", certificationDigest,
    "--expected-manifest-sha256", fixedDigest,
    "--expected-archive-sha256", fixedDigest,
  ], { encoding: "utf8" }).trim();
  assert.equal(validationDigest, fixedDigest);
});
