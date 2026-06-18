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
  it("starts a Postgres-id-backed Couple Questions lobby by default", async () => {
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

    expect(output.status).toBe("session");
    if (output.status !== "session") {
      throw new Error("Expected session output.");
    }

    expect(output.session.id).toBe("019ed5c9-03f7-7dc7-8660-f41abdeca21d");
    expect(output.session.status).toBe("active");
    expect(output.session.mode).toBe("couple_question");
    expect(output.session.phase).toBe("lobby");
    expect(output.session.players).toEqual(["user-1"]);
    expect(output.session.recentPromptIds).toEqual([]);
    expect(output.session.recentPromptTexts).toEqual([]);
    expect(output.session.promptQueue).toEqual([]);
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
      mode: "couple_question",
      mood: "flirty_safe",
      intensity: 2,
    });

    expect(output.status).toBe("session");
    if (output.status !== "session") {
      throw new Error("Expected session output.");
    }

    expect(output.session.mode).toBe("couple_question");
    expect(output.session.mood).toBe("flirty_safe");
    expect(intensityValue(output.session.intensity)).toBe(2);
    expect(output.session.phase).toBe("lobby");
  });

  it("starts Couple Questions from lobby with one or more joined players", async () => {
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
      mode: "couple_question",
    });

    const soloPrompt = await handleAction.execute({
      sessionId: started.session.id,
      action: "start_couple_question",
      userId: "user-1",
    });

    expect(soloPrompt.status).toBe("prompt");
    if (soloPrompt.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }
    expect(soloPrompt.session.players).toEqual(["user-1"]);
    expect(soloPrompt.session.phase).toBe("prompt_revealed");
    expect(soloPrompt.prompt.type).toBe("couple_question");

    const secondSession = await startGameSession.execute({
      guildId: "guild-1",
      channelId: "channel-1",
      startedByUserId: "user-1",
      mode: "couple_question",
    });
    const joined = await handleAction.execute({
      sessionId: secondSession.session.id,
      action: "join",
      userId: "user-2",
    });
    const groupPrompt = await handleAction.execute({
      sessionId: secondSession.session.id,
      action: "start_couple_question",
      userId: "user-1",
    });

    expect(joined.status).toBe("state");
    if (joined.status !== "state") {
      throw new Error("Expected state output.");
    }
    expect(joined.session.players).toEqual(["user-1", "user-2"]);
    expect(groupPrompt.status).toBe("prompt");
    if (groupPrompt.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }
    expect(groupPrompt.session.players).toEqual(["user-1", "user-2"]);
  });

  it("runs After Dark as a consent lobby with one or more joined players", async () => {
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
      mode: "after_dark",
      mood: "flirty_safe",
      intensity: 2,
    });

    expect(started.status).toBe("session");
    expect(started.session.mode).toBe("after_dark");
    expect(started.session.phase).toBe("lobby");

    const joined = await handleAction.execute({
      sessionId: started.session.id,
      action: "join",
      userId: "user-2",
    });
    const active = await handleAction.execute({
      sessionId: started.session.id,
      action: "start_after_dark",
      userId: "user-1",
    });

    expect(joined.status).toBe("state");
    if (joined.status !== "state") {
      throw new Error("Expected state output.");
    }
    expect(joined.session.players).toEqual(["user-1", "user-2"]);
    expect(active.status).toBe("prompt");
    if (active.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }
    expect(active.session.mode).toBe("after_dark");
    expect(active.session.phase).toBe("prompt_revealed");
    expect(active.prompt.type).toBe("after_dark");
  });

  it("runs Date Night as a five-step guided session", async () => {
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
      mode: "date_night",
      mood: "romantic",
      intensity: 2,
    });

    expect(started.status).toBe("session");
    expect(started.session.mode).toBe("date_night");
    expect(started.session.phase).toBe("lobby");

    const joined = await handleAction.execute({
      sessionId: started.session.id,
      action: "join",
      userId: "user-2",
    });
    const firstStep = await handleAction.execute({
      sessionId: started.session.id,
      action: "start_date_night",
      userId: "user-1",
    });

    expect(joined.status).toBe("state");
    if (joined.status !== "state") {
      throw new Error("Expected state output.");
    }
    expect(joined.session.players).toEqual(["user-1", "user-2"]);
    expect(firstStep.status).toBe("prompt");
    if (firstStep.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }
    expect(firstStep.session.currentTurnIndex).toBe(0);
    expect(firstStep.prompt.type).toBe("couple_question");
    expect(firstStep.prompt.id).toContain("date-night-warm-up");

    const skippedSameStep = await handleAction.execute({
      sessionId: started.session.id,
      action: "skip",
      userId: "user-2",
    });

    expect(skippedSameStep.status).toBe("prompt");
    if (skippedSameStep.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }
    expect(skippedSameStep.session.currentTurnIndex).toBe(0);
    expect(skippedSameStep.prompt.id).toContain("date-night-warm-up");

    const secondStep = await handleAction.execute({
      sessionId: started.session.id,
      action: "continue_date_night",
      userId: "user-1",
    });

    expect(secondStep.status).toBe("prompt");
    if (secondStep.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }
    expect(secondStep.session.currentTurnIndex).toBe(1);
    expect(secondStep.prompt.id).toContain("date-night-play");

    const thirdStep = await handleAction.execute({
      sessionId: started.session.id,
      action: "continue_date_night",
      userId: "user-1",
    });
    const fourthStep = await handleAction.execute({
      sessionId: started.session.id,
      action: "continue_date_night",
      userId: "user-1",
    });
    const fifthStep = await handleAction.execute({
      sessionId: started.session.id,
      action: "continue_date_night",
      userId: "user-1",
    });
    const completed = await handleAction.execute({
      sessionId: started.session.id,
      action: "continue_date_night",
      userId: "user-1",
    });

    expect(thirdStep.status).toBe("prompt");
    expect(fourthStep.status).toBe("prompt");
    expect(fifthStep.status).toBe("prompt");
    expect(completed.status).toBe("state");
    if (completed.status !== "state") {
      throw new Error("Expected state output.");
    }
    expect(completed.session.phase).toBe("completed");
    expect(completed.session.currentPrompt).toBeUndefined();
  });

  it("handles quick prompt buttons and avoids immediate repeats when alternatives exist", async () => {
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
    const active = await handleAction.execute({
      sessionId: started.session.id,
      action: "start_couple_question",
      userId: "user-1",
    });

    expect(active.status).toBe("prompt");
    if (active.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }

    const firstNext = await handleAction.execute({
      sessionId: active.session.id,
      action: "next",
      userId: "user-1",
    });
    const secondNext = await handleAction.execute({
      sessionId: active.session.id,
      action: "next",
      userId: "user-1",
    });

    expect(firstNext.status).toBe("prompt");
    expect(secondNext.status).toBe("prompt");

    if (firstNext.status !== "prompt" || secondNext.status !== "prompt") {
      throw new Error("Expected prompt outputs.");
    }

    expect(firstNext.prompt.type).toBe("couple_question");
    expect(secondNext.prompt.type).toBe("couple_question");
    expect(secondNext.prompt.id).not.toBe(firstNext.prompt.id);
  });

  it("opens This or That as a lobby from the command option", async () => {
    const sessions = new InMemorySessionRepository();
    const prompts = new StaticPromptCatalog();
    const queueRefiller = new PromptQueueRefiller(prompts);
    const startGameSession = new StartGameSessionUseCase(
      sessions,
      new FixedSessionIdGenerator("019ed5c9-03f7-7dc7-8660-f41abdeca21d"),
      queueRefiller,
    );
    const started = await startGameSession.execute({
      guildId: "guild-1",
      channelId: "channel-1",
      startedByUserId: "user-1",
      mode: "this_or_that",
    });

    expect(started.status).toBe("session");
    if (started.status !== "session") {
      throw new Error("Expected session output.");
    }

    expect(started.session.mode).toBe("this_or_that");
    expect(started.session.phase).toBe("lobby");
  });

  it("does not treat Truth or Dare prompt choices as standalone modes", async () => {
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
      mode: "couple_question",
    });

    const truth = await handleAction.execute({
      sessionId: started.session.id,
      action: "truth",
      userId: "user-1",
    });
    const dare = await handleAction.execute({
      sessionId: started.session.id,
      action: "dare",
      userId: "user-1",
    });

    expect(truth.status).toBe("blocked");
    expect(dare.status).toBe("blocked");

    if (truth.status !== "blocked" || dare.status !== "blocked") {
      throw new Error("Expected blocked outputs.");
    }

    expect(truth.reason).toBe("wrong_phase");
    expect(dare.reason).toBe("wrong_phase");
  });

  it("keeps Couple Questions locked to its mode while adjusting depth", async () => {
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
      mode: "couple_question",
      intensity: 1,
    });
    const active = await handleAction.execute({
      sessionId: started.session.id,
      action: "start_couple_question",
      userId: "user-1",
    });

    expect(active.status).toBe("prompt");
    if (active.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }

    const deeper = await handleAction.execute({
      sessionId: active.session.id,
      action: "deeper",
      userId: "user-1",
    });

    expect(deeper.status).toBe("prompt");
    if (deeper.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }

    expect(deeper.session.mode).toBe("couple_question");
    expect(deeper.prompt.type).toBe("couple_question");
    expect(intensityValue(deeper.session.intensity)).toBe(2);
  });

  it("runs This or That as a lobby with secret votes and reveal", async () => {
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
      mode: "this_or_that",
    });

    expect(started.status).toBe("session");
    expect(started.session.phase).toBe("lobby");
    expect(started.session.choiceVotes).toEqual([]);

    const tooEarly = await handleAction.execute({
      sessionId: started.session.id,
      action: "start_this_or_that",
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

    const active = await handleAction.execute({
      sessionId: started.session.id,
      action: "start_this_or_that",
      userId: "user-1",
    });

    expect(active.status).toBe("prompt");
    if (active.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }
    expect(active.session.mode).toBe("this_or_that");
    expect(active.session.phase).toBe("voting");
    expect(active.prompt.type).toBe("this_or_that");

    const outsider = await handleAction.execute({
      sessionId: started.session.id,
      action: "pick_left",
      userId: "user-3",
    });

    expect(outsider.status).toBe("blocked");
    if (outsider.status !== "blocked") {
      throw new Error("Expected blocked output.");
    }
    expect(outsider.reason).toBe("not_a_player");

    const firstPick = await handleAction.execute({
      sessionId: started.session.id,
      action: "pick_left",
      userId: "user-1",
    });

    expect(firstPick.status).toBe("acknowledged");
    if (firstPick.status !== "acknowledged") {
      throw new Error("Expected acknowledged output.");
    }
    expect(firstPick.session.phase).toBe("voting");
    expect(firstPick.session.choiceVotes).toEqual([
      { userId: "user-1", choice: "left" },
    ]);

    const nextTooSoon = await handleAction.execute({
      sessionId: started.session.id,
      action: "next",
      userId: "user-1",
    });

    expect(nextTooSoon.status).toBe("blocked");
    if (nextTooSoon.status !== "blocked") {
      throw new Error("Expected blocked output.");
    }
    expect(nextTooSoon.reason).toBe("wrong_phase");

    const secondPick = await handleAction.execute({
      sessionId: started.session.id,
      action: "pick_right",
      userId: "user-2",
    });

    expect(secondPick.status).toBe("acknowledged");
    if (secondPick.status !== "acknowledged") {
      throw new Error("Expected acknowledged output.");
    }
    expect(secondPick.session.phase).toBe("revealed");
    expect(secondPick.session.choiceVotes).toEqual([
      { userId: "user-1", choice: "left" },
      { userId: "user-2", choice: "right" },
    ]);

    const next = await handleAction.execute({
      sessionId: started.session.id,
      action: "next",
      userId: "user-1",
    });

    expect(next.status).toBe("prompt");
    if (next.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }
    expect(next.session.mode).toBe("this_or_that");
    expect(next.session.phase).toBe("voting");
    expect(next.session.choiceVotes).toEqual([]);
    expect(next.prompt.type).toBe("this_or_that");
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
    const active = await handleAction.execute({
      sessionId: started.session.id,
      action: "start_couple_question",
      userId: "user-1",
    });

    expect(active.status).toBe("prompt");
    if (active.status !== "prompt") {
      throw new Error("Expected prompt output.");
    }

    const spicier = await handleAction.execute({
      sessionId: active.session.id,
      action: "spicier",
      userId: "user-1",
    });
    const ended = await handleAction.execute({
      sessionId: active.session.id,
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
