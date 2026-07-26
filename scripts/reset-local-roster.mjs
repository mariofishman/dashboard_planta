import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = new URL(process.env.MONITOR_LOCAL_BASE_URL ?? "http://127.0.0.1:3000");
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(baseUrl.hostname)) {
  throw new Error("Refusing to reset a non-local Monitor server.");
}

async function checkedJson(path, init = {}) {
  const response = await fetch(new URL(path, baseUrl), init);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${path} failed (${response.status}): ${JSON.stringify(body)}`);
  return { response, body };
}

const { response: loginResponse } = await checkedJson("/api/auth/mock-login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ identityId: "monitor-admin" }),
});
const cookie = loginResponse.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("Local mock login did not return a session cookie.");

const authenticatedHeaders = { cookie };
const { body: current } = await checkedJson("/api/roster/assignments", { headers: authenticatedHeaders });
const fixture = JSON.parse(await readFile(new URL("./fixtures/original-roster.json", import.meta.url), "utf8"));

const backupDirectory = resolve("local-data/monitor/roster-backups");
await mkdir(backupDirectory, { recursive: true });
const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const backupPath = resolve(backupDirectory, `roster-before-reset-${timestamp}.json`);
await writeFile(backupPath, `${JSON.stringify(current, null, 2)}\n`, { flag: "wx", mode: 0o600 });

const { body: restored } = await checkedJson("/api/roster/assignments", {
  method: "PUT",
  headers: { ...authenticatedHeaders, "content-type": "application/json" },
  body: JSON.stringify({ revision: current.revision, assignments: fixture.assignments }),
});
if (restored.assignments.length !== fixture.assignments.length) {
  throw new Error(`Reset verification failed: expected ${fixture.assignments.length} people, received ${restored.assignments.length}.`);
}

console.log(`Roster restored to ${restored.assignments.length} original people at revision ${restored.revision}.`);
console.log(`Previous roster backup: ${backupPath}`);
