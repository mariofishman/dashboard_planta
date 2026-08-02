export interface Step7CaseEvidence {
  id: string;
  status: "passed";
  pollCycleIds: string[];
  queryIds: string[];
  runtimeEventIds: string[];
  interruptionIds: string[];
  timestamps: Record<string, string[]>;
  objectIds: Record<string, string[]>;
  assertions: Record<string, true>;
  cleanup: {
    executedInFinally: true;
    sourceRestored: true;
    beforeSourceIds: string[];
    afterSourceIds: string[];
  };
}

export interface Step7SuiteRecorder {
  record(entry: Step7CaseEvidence): void;
  finalize(): Promise<Record<string, unknown>>;
}

export function createStep7SuiteRecorder(
  suite: "scheduling" | "recovery",
  options?: { runId?: string; outputPath?: string },
): Step7SuiteRecorder;
