import type { DetectionQueryDefinition, DetectionSourceAdapter, SourcePage } from "./types.js";
import { DatabaseSync } from "node:sqlite";

export class MemorySourceAdapter implements DetectionSourceAdapter {
  constructor(
    public pages: SourcePage[],
    private readonly behavior: "normal" | "timeout" | "error" = "normal",
  ) {}

  async readPage(input: { query: DetectionQueryDefinition; cursor: string | null; limit: number; signal: AbortSignal }): Promise<SourcePage> {
    if (this.behavior === "error") throw new Error("simulated_source_failure");
    if (this.behavior === "timeout") {
      return new Promise((_resolve, reject) => input.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
    }
    const pageIndex = input.cursor === null ? 0 : Number(input.cursor);
    const page = this.pages[pageIndex];
    if (!page) throw new Error("missing_simulated_page");
    return structuredClone(page);
  }
}

export function page(rows: Record<string, unknown>[], options: Partial<Omit<SourcePage, "rows">> = {}): SourcePage {
  return {
    rows,
    nextCursor: options.nextCursor ?? null,
    complete: options.complete ?? true,
    sourceRevision: options.sourceRevision ?? "fixture-set.v1",
    schemaVersion: options.schemaVersion ?? "1.0.0",
  };
}

export class ReadonlyBackupSqliteAdapter implements DetectionSourceAdapter {
  private readonly database: DatabaseSync;
  constructor(
    databasePath: string,
    private readonly sql: string,
    private readonly cutoff: string,
    private readonly revision: string,
  ) {
    this.database = new DatabaseSync(databasePath, { readOnly: true });
  }
  async readPage(input: { query: DetectionQueryDefinition; cursor: string | null; limit: number; signal: AbortSignal }): Promise<SourcePage> {
    if (input.signal.aborted) throw new Error("aborted");
    const statement = this.database.prepare(this.sql);
    const rows = statement.all({
      after_id: input.cursor === null ? 0 : Number(input.cursor),
      cutoff: this.cutoff,
      result_limit: input.limit,
    }) as Record<string, unknown>[];
    const complete = rows.length < input.limit;
    const last = rows.at(-1);
    return {
      rows,
      complete,
      nextCursor: complete || !last ? null : String(last[input.query.keyField]),
      sourceRevision: this.revision,
      schemaVersion: input.query.queryVersion,
    };
  }
  close(): void { this.database.close(); }
}

export function backupCutoff(databasePath: string): string {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const row = database.prepare(`SELECT datetime(MAX(value), '-30 minutes') AS cutoff FROM (
      SELECT MAX(fecha_creacion) value FROM flujo_materiales_detalles
      UNION ALL SELECT MAX(fecha_creacion) value FROM articulo_serial
    )`).get() as { cutoff?: unknown } | undefined;
    if (typeof row?.cutoff !== "string") throw new Error("backup_cutoff_unavailable");
    return row.cutoff;
  } finally {
    database.close();
  }
}
