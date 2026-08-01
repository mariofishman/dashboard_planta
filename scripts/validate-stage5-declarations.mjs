import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { assertValidStage5Declarations } from "./lib/stage5-declaration-validator.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const manifest = await readJson("config/detection/stage5-connected-acceptance.v2.json");
const sourceActionContract = await readJson("config/detection/source-actions/stage5-source-actions.v1.json");
const ledgerSchema = await readJson("config/detection/schemas/stage5-connected-ledger-result.v1.schema.json");

assertValidStage5Declarations(manifest, sourceActionContract, ledgerSchema);
console.log("Stage 5.1 declarations valid: exact 34-ID manifest and strict ledger-result schema.");
