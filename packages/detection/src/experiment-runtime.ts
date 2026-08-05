import type { CycleResult, DetectionQueryDefinition, DetectionSourceAdapter } from "./types.js";
import type { DetectionScheduler } from "./scheduler.js";
import {
  ScenarioExperimentRepository,
  type ExperimentPollingFrequencyMinutes,
  type ExperimentSecondsPerSimulatedMinute,
  type ScenarioDuePoll,
  type ScenarioExperiment,
  type ScenarioExperimentIdentity,
} from "./experiment.js";
import type { ScenarioRuleCode, ScenarioSource } from "./scenario-source.js";

type ScenarioRegistry = Map<ScenarioRuleCode, { query: DetectionQueryDefinition; adapter: DetectionSourceAdapter }>;
interface ScenarioRuntimeTrigger {
  trigger: "automatic_timer" | "manual_advance" | "source_action_boundary";
  timerDeadline?: string;
  timerObservedAt?: string;
}

export interface ScenarioRuntimeStatus {
  experiment: ScenarioExperiment | null;
  automaticScheduling: boolean;
  realMillisecondsPerSimulatedMinute: number | null;
  nextAutomaticTickAt: string | null;
}

export interface ScenarioRuntimePoll {
  ruleCode: ScenarioRuleCode;
  dueAt: string;
  result: CycleResult;
}

export interface ScenarioRuntimeAdvance {
  experiment: ScenarioExperiment;
  polls: ScenarioRuntimePoll[];
}

export class ScenarioExperimentRuntime {
  private queue: Promise<void> = Promise.resolve();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private timerGeneration = 0;

  constructor(
    private readonly repository: ScenarioExperimentRepository,
    private readonly source: ScenarioSource,
    private readonly scheduler: DetectionScheduler,
    private readonly registry: ScenarioRegistry,
    private readonly automaticScheduling: boolean,
    private readonly onError: (error: unknown) => void = () => {},
    private readonly now: () => number = Date.now,
  ) {}

  async initialize(): Promise<ScenarioRuntimeStatus> {
    return this.serialized(async () => {
      const runtime = await this.repository.activeRuntime();
      if (runtime.experiment) {
        await this.source.setBusinessTime(runtime.experiment.businessTime);
        await this.source.setSourceCutoffAt?.(runtime.experiment.sourceCutoffAt);
      } else await this.source.setSourceCutoffAt?.(null);
      const nextTickAt = runtime.experiment?.status === "running" ? runtime.nextTickAt ?? this.nextDeadline(runtime.experiment.secondsPerSimulatedMinute) : null;
      if (runtime.experiment && nextTickAt !== runtime.nextTickAt) await this.repository.setNextTick(runtime.experiment.id, nextTickAt);
      this.arm(runtime.experiment, nextTickAt);
      return this.describe(runtime.experiment, nextTickAt);
    });
  }

  async create(input: {
    name: string;
    businessTime: string;
    pollingFrequencyMinutes: ExperimentPollingFrequencyMinutes;
    sourceLookbackDays?: number;
    identity: ScenarioExperimentIdentity;
  }): Promise<ScenarioRuntimeStatus> {
    return this.serialized(async () => {
      const created = await this.repository.create(input.name, input.businessTime, input.pollingFrequencyMinutes, input.identity, input.sourceLookbackDays);
      const active = await this.repository.activate(created.id, null);
      await this.source.setBusinessTime(active.businessTime);
      await this.source.setSourceCutoffAt?.(active.sourceCutoffAt);
      this.arm(active, null);
      return this.describe(active, null);
    });
  }

  async status(): Promise<ScenarioRuntimeStatus> {
    const runtime = await this.repository.activeRuntime();
    return this.describe(runtime.experiment, runtime.nextTickAt);
  }

  async configure(id: string, secondsPerSimulatedMinute: ExperimentSecondsPerSimulatedMinute, pollingFrequencyMinutes: ExperimentPollingFrequencyMinutes): Promise<ScenarioRuntimeStatus> {
    return this.serialized(async () => {
      await this.requireActive(id);
      const experiment = await this.repository.configure(id, secondsPerSimulatedMinute, pollingFrequencyMinutes);
      const nextTickAt = experiment.status === "running" ? this.nextDeadline(experiment.secondsPerSimulatedMinute) : null;
      await this.repository.setNextTick(id, nextTickAt);
      this.arm(experiment, nextTickAt);
      return this.describe(experiment, nextTickAt);
    });
  }

  async setSourceLookbackDays(id: string, sourceLookbackDays: number): Promise<ScenarioRuntimeStatus> {
    return this.serialized(async () => {
      await this.requireActive(id);
      const experiment = await this.repository.setSourceLookbackDays(id, sourceLookbackDays);
      await this.source.setSourceCutoffAt?.(experiment.sourceCutoffAt);
      const runtime = await this.repository.activeRuntime();
      return this.describe(experiment, runtime.nextTickAt);
    });
  }

  async pause(id: string, paused: boolean): Promise<ScenarioRuntimeStatus> {
    return this.serialized(async () => {
      await this.requireActive(id);
      const experiment = await this.repository.pause(id, paused);
      const nextTickAt = paused ? null : this.nextDeadline(experiment.secondsPerSimulatedMinute);
      await this.repository.setNextTick(id, nextTickAt);
      this.arm(experiment, nextTickAt);
      return this.describe(experiment, nextTickAt);
    });
  }

  async advance(id: string, minutes: number): Promise<ScenarioRuntimeAdvance> {
    return this.serialized(async () => {
      await this.requireActive(id);
      const result = await this.advanceLocked(id, minutes, { trigger: "manual_advance" });
      const nextTickAt = result.experiment.status === "running" ? this.nextDeadline(result.experiment.secondsPerSimulatedMinute) : null;
      await this.repository.setNextTick(id, nextTickAt);
      this.arm(result.experiment, nextTickAt);
      return result;
    });
  }

  async executeBeforeSourceAction<T>(work: () => Promise<T>): Promise<T> {
    return this.serialized(async () => {
      const active = await this.repository.active();
      if (active?.status === "running") await this.advanceLocked(active.id, 0, { trigger: "source_action_boundary" });
      const result = await work();
      if (active && result && typeof result === "object") {
        const event = result as Record<string, unknown>;
        if (typeof event.actionId === "string" && ["A02", "A03", "A05"].includes(String(event.ruleCode))) {
          await this.repository.recordRuntimeEvent(active.id, "source_action", event.ruleCode as ScenarioRuleCode, active.businessTime, event);
        }
      }
      return result;
    });
  }

  async executeSerialized<T>(work: () => Promise<T>): Promise<T> {
    return this.serialized(work);
  }

  stop(): void {
    this.timerGeneration += 1;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  async shutdown(): Promise<void> {
    this.stop();
    await this.queue;
  }

  async resetLocalState(work: () => Promise<void>): Promise<void> {
    return this.serialized(async () => {
      this.stop();
      await work();
      await this.source.resetAfterDatabaseRestore?.();
    });
  }

  private async advanceLocked(id: string, minutes: number, trigger: ScenarioRuntimeTrigger): Promise<ScenarioRuntimeAdvance> {
    const plan = await this.repository.planAdvance(id, minutes);
    if (plan.experiment.status !== "running") return { experiment: plan.experiment, polls: [] };
    const polls: ScenarioRuntimePoll[] = [];
    for (const due of plan.due) polls.push(await this.runDue(id, due, trigger));
    await this.source.setBusinessTime(plan.targetTime);
    const experiment = await this.repository.setBusinessTime(id, plan.targetTime);
    return { experiment, polls };
  }

  private async runDue(id: string, due: ScenarioDuePoll, trigger: ScenarioRuntimeTrigger): Promise<ScenarioRuntimePoll> {
    await this.source.setBusinessTime(due.dueAt);
    await this.repository.setBusinessTime(id, due.dueAt);
    const entry = this.registry.get(due.ruleCode);
    if (!entry) throw new Error(`missing_scenario_runtime_query:${due.ruleCode}`);
    await this.repository.recordRuntimeEvent(id, "poll_started", due.ruleCode, due.dueAt, { queryId: entry.query.queryId, ...trigger });
    try {
      const result = await this.scheduler.runScheduled(entry.query, entry.adapter);
      const trustedCompletion = result.status === "healthy" && result.complete && result.fullEvaluation;
      await this.repository.recordRuntimeEvent(id, trustedCompletion ? "poll_completed" : "poll_failed", due.ruleCode, due.dueAt,
        { ...result, ...trigger } as unknown as Record<string, unknown>);
      await this.repository.completeDue(id, due);
      return { ...due, result };
    } catch (error) {
      await this.repository.recordRuntimeEvent(id, "poll_failed", due.ruleCode, due.dueAt, {
        queryId: entry.query.queryId,
        ...trigger,
        error: error instanceof Error ? error.message : "unknown_error",
      });
      throw error;
    }
  }

  private async requireActive(id: string): Promise<ScenarioExperiment> {
    const active = await this.repository.active();
    if (!active || active.id !== id) throw new Error("scenario_experiment_not_active");
    return active;
  }

  private describe(experiment: ScenarioExperiment | null, nextAutomaticTickAt: string | null): ScenarioRuntimeStatus {
    return {
      experiment,
      automaticScheduling: this.automaticScheduling,
      realMillisecondsPerSimulatedMinute: experiment ? experiment.secondsPerSimulatedMinute * 1_000 : null,
      nextAutomaticTickAt,
    };
  }

  private arm(experiment: ScenarioExperiment | null, nextTickAt: string | null): void {
    this.timerGeneration += 1;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.automaticScheduling || experiment?.status !== "running" || !nextTickAt) return;
    const generation = this.timerGeneration;
    this.timer = setTimeout(() => {
      void this.serialized(async () => {
        if (generation !== this.timerGeneration) return;
        const runtime = await this.repository.activeRuntime();
        let active = runtime.experiment;
        if (!active || active.id !== experiment.id || active.status !== "running" || runtime.nextTickAt !== nextTickAt) {
          this.onError(new Error("scenario_runtime_timer_ownership_changed"));
          return;
        }
        const interval = this.interval(active.secondsPerSimulatedMinute);
        const observedNow = this.now();
        if (observedNow < Date.parse(nextTickAt)) {
          this.arm(active, nextTickAt);
          return;
        }
        const dueTicks = Math.floor((observedNow - Date.parse(nextTickAt)) / interval) + 1;
        let completedTicks = dueTicks;
        try {
          active = (await this.advanceLocked(active.id, dueTicks, {
            trigger: "automatic_timer",
            timerDeadline: nextTickAt,
            timerObservedAt: new Date(observedNow).toISOString(),
          })).experiment;
        } catch (error) {
          completedTicks = 1;
          throw error;
        } finally {
          if (generation === this.timerGeneration && active) {
            const followingTick = new Date(Date.parse(nextTickAt) + completedTicks * interval).toISOString();
            await this.repository.setNextTick(active.id, followingTick);
            this.arm(active, followingTick);
          }
        }
      }).catch(this.onError);
    }, Math.max(0, Date.parse(nextTickAt) - this.now()));
    this.timer.unref?.();
  }

  private interval(secondsPerSimulatedMinute: ExperimentSecondsPerSimulatedMinute): number {
    return secondsPerSimulatedMinute * 1_000;
  }

  private nextDeadline(secondsPerSimulatedMinute: ExperimentSecondsPerSimulatedMinute): string {
    return new Date(this.now() + this.interval(secondsPerSimulatedMinute)).toISOString();
  }

  private serialized<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work, work);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
}
