import { constants } from "node:fs";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const requireFromDetection = createRequire(resolve(root, "packages/detection/package.json"));
const mysql = requireFromDetection("mysql2/promise");
const protectedDump = process.env.TEST_DB_DUMP ?? "/Users/mariofishman/projects/dashboard_planta/local-data/database/staging_emusa_core-20260723-025548.sql";
const runtime = process.env.TEST_DB_RUNTIME_ROOT ?? resolve(dirname(dirname(protectedDump)), "test-database");
const readyFile = resolve(runtime, "state/ready");
const resetLock = resolve(runtime, "state/reset.lock");
const evidenceDirectory = resolve(runtime, "evidence");

function fail(message) {
  throw new Error(message);
}

async function requireReadableMode600(path) {
  await access(path, constants.R_OK);
  const metadata = await stat(path);
  if ((metadata.mode & 0o777) !== 0o600) fail(`credential file must have mode 600: ${path}`);
}

async function readClientConfig(account) {
  const path = resolve(runtime, `secrets/${account}.host.cnf`);
  await requireReadableMode600(path);
  const values = {};
  for (const rawLine of (await readFile(path, "utf8")).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("[")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) fail(`invalid client configuration: ${path}`);
    values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  for (const key of ["host", "port", "user", "password"]) {
    if (!values[key]) fail(`missing ${key} in client configuration: ${path}`);
  }
  return {
    host: values.host,
    port: Number(values.port),
    user: values.user,
    password: values.password,
    database: "test_database",
    charset: "utf8mb4",
    connectTimeout: 3_000,
    dateStrings: true,
    multipleStatements: false,
    namedPlaceholders: true,
  };
}

async function requireReady() {
  await access(readyFile, constants.R_OK).catch(() => fail("test_database is not marked ready"));
  await access(resetLock).then(
    () => fail("test_database reset is active"),
    (error) => {
      if (error.code !== "ENOENT") throw error;
    },
  );
}

async function probeWriter() {
  const connection = await mysql.createConnection(await readClientConfig("writer"));
  try {
    await connection.beginTransaction();
    await connection.execute(
      "INSERT INTO `_prisma_migrations` (`id`,`checksum`,`migration_name`,`started_at`,`applied_steps_count`) VALUES (?,?,?,?,?)",
      ["monitor-driver-proof", "monitor-driver-proof", "monitor-driver-proof", new Date(), 0],
    );
    await connection.execute("UPDATE `_prisma_migrations` SET `checksum`=? WHERE `id`=?", ["monitor-driver-proof-updated", "monitor-driver-proof"]);
    await connection.execute("DELETE FROM `_prisma_migrations` WHERE `id`=?", ["monitor-driver-proof"]);
  } finally {
    await connection.rollback().catch(() => undefined);
    await connection.end();
  }
}

async function probeMonitor() {
  const connection = await mysql.createConnection(await readClientConfig("monitor"));
  try {
    const [rows] = await connection.query("SELECT COUNT(*) AS count FROM information_schema.views WHERE table_schema='test_database'");
    if (Number(rows[0]?.count) !== 111) fail("Monitor driver could not read all restored views");
    const [cutoffRows] = await connection.query("SELECT DATE_FORMAT(DATE_SUB(MAX(source_time), INTERVAL 30 MINUTE),'%Y-%m-%d %H:%i:%s.%f') AS cutoff FROM (SELECT MAX(fecha_creacion) source_time FROM flujo_materiales_detalles UNION ALL SELECT MAX(fecha_creacion) FROM articulo_serial) source_times");
    const cutoff = cutoffRows[0]?.cutoff;
    if (typeof cutoff !== "string") fail("Monitor driver could not derive the backup-relative cutoff");
    for (const [filename, key] of [
      ["a02-reserved-material-in-transit.v1.sql", "materialFlowDetailId"],
      ["a05-reel-handling.v1.sql", "articleSerialId"],
    ]) {
      const sql = await readFile(resolve(root, "config/detection/queries", filename), "utf8");
      const [queryRows] = await connection.query(sql, { after_id: 0, cutoff, result_limit: 1 });
      if (queryRows.length !== 1 || !Number.isInteger(queryRows[0]?.[key])) fail(`Monitor driver query probe failed: ${filename}`);
    }
    try {
      await connection.execute("INSERT INTO `_prisma_migrations` (`id`,`checksum`,`migration_name`,`started_at`,`applied_steps_count`) VALUES (?,?,?,?,?)", ["monitor-driver-denied", "x", "x", new Date(), 0]);
      fail("Monitor driver write unexpectedly succeeded");
    } catch (error) {
      if (error.message === "Monitor driver write unexpectedly succeeded") throw error;
      if (![1044, 1142, 1143].includes(error.errno)) fail(`Monitor driver write failed for an unexpected reason: ${error.code ?? "unknown"}`);
    }
  } finally {
    await connection.end();
  }
}

await requireReady();
await probeWriter();
await probeMonitor();

const validatedAt = new Date().toISOString();
await mkdir(evidenceDirectory, { recursive: true });
await writeFile(
  resolve(evidenceDirectory, "latest-driver-probe.txt"),
  `validated_at=${validatedAt}\ndriver=mysql2\nwriter_dml_rollback=passed\nmonitor_read=passed\nmonitor_a02_query=passed\nmonitor_a05_query=passed\nmonitor_write_denied=passed\n`,
  { mode: 0o600 },
);
console.log(`MySQL application-driver probe passed: ${resolve(evidenceDirectory, "latest-driver-probe.txt")}`);
