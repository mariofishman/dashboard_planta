import type { DatabaseRuntime } from "@monitor/database";
import type { ScenarioExperimentRuntime } from "@monitor/detection";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

export type TestDatabaseResetStage =
  | "idle"
  | "validating"
  | "restoring_source"
  | "validating_source"
  | "clearing_monitor"
  | "succeeded"
  | "failed";

export interface TestDatabaseResetStatus {
  stage: TestDatabaseResetStage;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

export class TestDatabaseResetCoordinator {
  private state: TestDatabaseResetStatus = { stage: "idle", startedAt: null, finishedAt: null, error: null };

  constructor(
    private readonly repositoryRoot: string,
    private readonly database: DatabaseRuntime,
    private readonly runtime: ScenarioExperimentRuntime,
    private readonly clearRuntimeIdentity: () => void = () => {},
    private readonly restoreOverride?: () => Promise<void>,
  ) {}

  status(): TestDatabaseResetStatus {
    return { ...this.state };
  }

  start(): TestDatabaseResetStatus {
    if (!["idle", "succeeded", "failed"].includes(this.state.stage)) throw new Error("test_database_reset_active");
    this.state = { stage: "validating", startedAt: new Date().toISOString(), finishedAt: null, error: null };
    void this.run();
    return this.status();
  }

  private async run(): Promise<void> {
    try {
      await this.runtime.resetLocalState(async () => {
        await this.restoreSource();
        this.state.stage = "clearing_monitor";
        await this.database.transaction(async (transaction) => {
          await transaction.execute(`TRUNCATE TABLE
            monitor_scenario_experiment,
            monitor_incident,
            monitor_conversation,
            monitor_poll_cycle,
            monitor_condition_state,
            monitor_change_event,
            monitor_test_interruption
            RESTART IDENTITY CASCADE`);
        });
        this.clearRuntimeIdentity();
      });
      this.state = { ...this.state, stage: "succeeded", finishedAt: new Date().toISOString(), error: null };
    } catch (error) {
      this.state = {
        ...this.state,
        stage: "failed",
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "test_database_reset_failed",
      };
      await this.runtime.initialize().catch(() => undefined);
    }
  }

  private restoreSource(): Promise<void> {
    if (this.restoreOverride) {
      this.state.stage = "restoring_source";
      return this.restoreOverride().then(() => { this.state.stage = "validating_source"; });
    }
    return new Promise((resolvePromise, reject) => {
      const child = spawn("bash", [resolve(this.repositoryRoot, "scripts/test-database-reset.sh")], {
        cwd: this.repositoryRoot,
        env: { ...process.env, ALLOW_TEST_DATABASE_RESET: "yes" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let failure = "";
      const inspect = (chunk: Buffer) => {
        const text = chunk.toString("utf8");
        failure = (failure + text).slice(-8_000);
        if (text.includes("Dropping and recreating")) this.state.stage = "restoring_source";
        if (text.includes("Streaming the read-only protected backup")) this.state.stage = "restoring_source";
        if (text.includes("Rebuild passed")) this.state.stage = "validating_source";
      };
      child.stdout.on("data", inspect);
      child.stderr.on("data", inspect);
      child.once("error", reject);
      child.once("exit", (code) => {
        if (code === 0) resolvePromise();
        else reject(new Error(failure.trim().split("\n").at(-1) || `test_database_reset_exit_${code}`));
      });
    });
  }
}
