import { describe, expect, it } from "vitest";

import { HandleGameActionUseCase } from "../../src/application/use-cases/handle-game-action";
import { StartGameSessionUseCase } from "../../src/application/use-cases/start-game-session";
import type { SessionIdGenerator } from "../../src/application/ports/session-id-generator";
import type { SessionRepository } from "../../src/application/ports/session-repository";
import { PromptQueueRefiller } from "../../src/application/services/prompt-queue-refiller";
import type { GameSession } from "../../src/domain/entities/game-session";
import { createSessionId, type SessionId } from "../../src/domain/value-objects/ids";
import { intensityValue } from "../../src/domain/value-objects/intensity";
import { StaticPromptCatalog } from "../../src/infrastructure/content/static-prompt-catalog";

describe("static game loop", () => {
  it("starts a Postgres-id-backed session with an initial prompt", async () => {
    const sessions = new InMemorySessionRepository();
    const startGameSession = new StartGameSessionUseCase(
      sessions,
      new FixedSessionIdGenerator("019ed5c9-03f7-7dc7-8660-f41abdeca21d"),
      new PromptQueueRefiller(new StaticPromptCatalog()),
    );

    const output = await startGameSession.execute({
      guildId: "guild-1",
      channelId: "channel-1",
      startedByUserId: "user-1",
    });

    expect(output.session.id).toBe("019ed5c9-03f7-7dc7-8660-f41abdeca21d");
    expect(output.session.status).toBe("active");
    expect(output.session.recentPromptIds).toEqual([output.prompt.id]);
    expect(output.session.promptQueue.length).toBeGreaterThan(0);
    expect(await sessions.findById(output.session.id)).toEqual(output.session);
  });

  it("starts with requested mode, mood, and intensity", async () => {
    const sessions = new InMemorySessionRepository();
    const startGameSession = new StartGameSessionUseCase(
      sessions,
      new FixedSessionIdGenerator("019ed5c9-03f7-7dc7-8660-f41abdeca21d"),
      new PromptQueueRefiller(new StaticPromptCatalog()),
    );

    const output = await startGameSession.execute({
      guildId: "guild-1",
      channelId: "channel-1",
      startedByUserId: "user-1",
      mode: "this_or_that",
      mood: "flirty_safe",
      intensity: 2,
    });

    expect(output.session.mode).toBe("this_or_that");
    expect(output.session.mood).toBe("flirty_safe");
    expect(intensityValue(output.session.intensity)).toBe(2);
    expect(output.prompt.type).toBe("this_or_that");
    expect(output.prompt.mood).toBe("flirty_safe");
  });

  it("handles prompt buttons and avoids immediate repeats when alternatives exist", async () => {
    const sessions = new InMemorySessionRepository();
    const sessionIds = new FixedSessionIdGenerator(
      "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    );
    const prompts = new StaticPromptCatalog();
    const queueRefiller = new PromptQueueRefiller(prompts);
    const startGameSession = new StartGameSessionUseCase(
      sessions,
      sessionIds,
      queueRefiller,
    );
    const handleAction = new HandleGameActionUseCase(sessions, queueRefiller);
    const started = await startGameSession.execute({
      guildId: "guild-1",
      channelId: "channel-1",
      startedByUserId: "user-1",
    });

    const firstTruth = await handleAction.execute({
      sessionId: started.session.id,
      action: "truth",
    });
    const secondTruth = await handleAction.execute({
      sessionId: started.session.id,
      action: "truth",
    });

    expect(firstTruth.status).toBe("prompt");
    expect(secondTruth.status).toBe("prompt");

    if (firstTruth.status !== "prompt" || secondTruth.status !== "prompt") {
      throw new Error("Expected prompt outputs.");
    }

    expect(firstTruth.prompt.type).toBe("truth");
    expect(secondTruth.prompt.type).toBe("truth");
    expect(secondTruth.prompt.id).not.toBe(firstTruth.prompt.id);
  });

  it("switches to every MVP game mode from actions", async () => {
    const sessions = new InMemorySessionRepository();
    const prompts = new StaticPromptCatalog();
    const queueRefiller = new PromptQueueRefiller(prompts);
    const startGameSession = new StartGameSessionUseCase(
      sessions,
      new FixedSessionIdGenerator("019ed5c9-03f7-7dc7-8660-f41abdeca21d"),
      queueRefiller,
    );
    const handleAction = new HandleGameActionUseCase(sessions, queueRefiller);
    const started = await startGameSession.execute({
      guildId: "guild-1",
      channelId: "channel-1",
      startedByUserId: "user-1",
    });

    const coupleQuestion = await handleAction.execute({
      sessionId: started.session.id,
      action: "couple_question",
    });
    const thisOrThat = await handleAction.execute({
      sessionId: started.session.id,
      action: "this_or_that",
    });

    expect(coupleQuestion.status).toBe("prompt");
    expect(thisOrThat.status).toBe("prompt");

    if (coupleQuestion.status !== "prompt" || thisOrThat.status !== "prompt") {
      throw new Error("Expected prompt outputs.");
    }

    expect(coupleQuestion.prompt.type).toBe("couple_question");
    expect(thisOrThat.prompt.type).toBe("this_or_that");
  });

  it("keeps comfort controls bounded and ends the session", async () => {
    const sessions = new InMemorySessionRepository();
    const prompts = new StaticPromptCatalog();
    const queueRefiller = new PromptQueueRefiller(prompts);
    const startGameSession = new StartGameSessionUseCase(
      sessions,
      new FixedSessionIdGenerator("019ed5c9-03f7-7dc7-8660-f41abdeca21d"),
      queueRefiller,
    );
    const handleAction = new HandleGameActionUseCase(sessions, queueRefiller);
    const started = await startGameSession.execute({
      guildId: "guild-1",
      channelId: "channel-1",
      startedByUserId: "user-1",
      intensity: 3,
    });

    const spicier = await handleAction.execute({
      sessionId: started.session.id,
      action: "spicier",
    });
    const ended = await handleAction.execute({
      sessionId: started.session.id,
      action: "end",
      now: new Date("2026-06-17T00:00:00.000Z"),
    });

    expect(spicier.status).toBe("prompt");
    if (spicier.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }

    expect(intensityValue(spicier.session.intensity)).toBe(3);
    expect(ended.status).toBe("ended");
  });
});

class FixedSessionIdGenerator implements SessionIdGenerator {
  public constructor(private readonly value: string) {}

  public async next(): Promise<SessionId> {
    return createSessionId(this.value);
  }
}

class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<SessionId, GameSession>();

  public async save(session: GameSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  public async findById(id: SessionId): Promise<GameSession | null> {
    return this.sessions.get(id) ?? null;
  }
}
