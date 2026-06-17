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

    expect(output.status).toBe("prompt");
    if (output.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }

    expect(output.session.id).toBe("019ed5c9-03f7-7dc7-8660-f41abdeca21d");
    expect(output.session.status).toBe("active");
    expect(output.session.recentPromptIds).toEqual([output.prompt.id]);
    expect(output.session.recentPromptTexts).toEqual([output.prompt.text]);
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

    expect(output.status).toBe("prompt");
    if (output.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }

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
      userId: "user-1",
    });
    const secondTruth = await handleAction.execute({
      sessionId: started.session.id,
      action: "truth",
      userId: "user-1",
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
      userId: "user-1",
    });
    const thisOrThat = await handleAction.execute({
      sessionId: started.session.id,
      action: "this_or_that",
      userId: "user-1",
    });

    expect(coupleQuestion.status).toBe("prompt");
    expect(thisOrThat.status).toBe("prompt");

    if (coupleQuestion.status !== "prompt" || thisOrThat.status !== "prompt") {
      throw new Error("Expected prompt outputs.");
    }

    expect(coupleQuestion.prompt.type).toBe("couple_question");
    expect(thisOrThat.prompt.type).toBe("this_or_that");
  });

  it("runs Truth or Dare as a lobby and turn-based session", async () => {
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
      mode: "truth_or_dare",
    });

    expect(started.status).toBe("session");
    expect(started.session.phase).toBe("lobby");
    expect(started.session.playContext).toBe("e_meet");
    expect(started.session.promptQueue).toHaveLength(0);

    const tooEarly = await handleAction.execute({
      sessionId: started.session.id,
      action: "start_tod",
      userId: "user-1",
    });

    expect(tooEarly.status).toBe("blocked");
    if (tooEarly.status !== "blocked") {
      throw new Error("Expected blocked output.");
    }
    expect(tooEarly.reason).toBe("not_enough_players");

    const joined = await handleAction.execute({
      sessionId: started.session.id,
      action: "join",
      userId: "user-2",
    });

    expect(joined.status).toBe("state");
    if (joined.status !== "state") {
      throw new Error("Expected state output.");
    }
    expect(joined.session.players).toEqual(["user-1", "user-2"]);

    const meetContext = await handleAction.execute({
      sessionId: started.session.id,
      action: "set_context_meet",
      userId: "user-1",
    });

    expect(meetContext.status).toBe("state");
    if (meetContext.status !== "state") {
      throw new Error("Expected state output.");
    }
    expect(meetContext.session.playContext).toBe("meet");

    const active = await handleAction.execute({
      sessionId: started.session.id,
      action: "start_tod",
      userId: "user-1",
    });

    expect(active.status).toBe("state");
    if (active.status !== "state") {
      throw new Error("Expected state output.");
    }
    expect(active.session.phase).toBe("turn_choice");
    expect(active.session.playContext).toBe("meet");

    const lateContextChange = await handleAction.execute({
      sessionId: started.session.id,
      action: "set_context_e_meet",
      userId: "user-1",
    });

    expect(lateContextChange.status).toBe("blocked");
    if (lateContextChange.status !== "blocked") {
      throw new Error("Expected blocked output.");
    }
    expect(lateContextChange.reason).toBe("not_in_lobby");

    const wrongPlayer = await handleAction.execute({
      sessionId: started.session.id,
      action: "truth",
      userId: "user-2",
    });

    expect(wrongPlayer.status).toBe("blocked");
    if (wrongPlayer.status !== "blocked") {
      throw new Error("Expected blocked output.");
    }
    expect(wrongPlayer.reason).toBe("not_current_player");

    const truth = await handleAction.execute({
      sessionId: started.session.id,
      action: "truth",
      userId: "user-1",
    });

    expect(truth.status).toBe("prompt");
    if (truth.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }
    expect(truth.prompt.type).toBe("truth");
    expect(truth.session.phase).toBe("prompt_revealed");
    expect(truth.session.recentPromptTexts).toContain(truth.prompt.text);
    expect(truth.session.promptQueue.length).toBeGreaterThan(0);

    const answered = await handleAction.execute({
      sessionId: started.session.id,
      action: "answered",
      userId: "user-1",
    });

    expect(answered.status).toBe("state");
    if (answered.status !== "state") {
      throw new Error("Expected state output.");
    }
    expect(answered.session.phase).toBe("turn_choice");
    expect(answered.session.currentTurnIndex).toBe(1);

    const dare = await handleAction.execute({
      sessionId: started.session.id,
      action: "dare",
      userId: "user-2",
    });

    expect(dare.status).toBe("prompt");
    if (dare.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }
    expect(dare.prompt.type).toBe("dare");
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
      userId: "user-1",
    });
    const ended = await handleAction.execute({
      sessionId: started.session.id,
      action: "end",
      userId: "user-1",
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
