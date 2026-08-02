import type { TestInterruptionController } from "./test-interruptions.js";

export interface CommittedChangePublication {
  channel: "incident.changed" | "message.created";
  eventId: string;
  cursor: number;
  eventType: string;
  scopeType: "plant" | "conversation";
  scopeId: string;
  payload: Record<string, unknown>;
}

export class CommittedChangePublisher {
  constructor(private readonly interruptions: Pick<TestInterruptionController, "fire">) {}

  async publish(change: CommittedChangePublication, emit: () => void | Promise<void>): Promise<void> {
    const context = {
      channel: change.channel,
      eventId: change.eventId,
      cursor: change.cursor,
      eventType: change.eventType,
      scopeType: change.scopeType,
      scopeId: change.scopeId,
      payload: change.payload,
    };
    await this.interruptions.fire("before_change_publication", context);
    await emit();
    await this.interruptions.fire("after_change_publication", context);
  }
}
