import type { Mood, PromptType } from "../domain/entities/prompt";
import type { PlayContext } from "../domain/entities/game-session";

export interface StaticPromptTemplate {
  readonly id: string;
  readonly type: PromptType;
  readonly mood: Mood;
  readonly intensity: 1 | 2 | 3;
  readonly text: string;
  readonly followUp?: string;
  readonly playContexts?: readonly PlayContext[];
}

export const staticPromptTemplates: readonly StaticPromptTemplate[] = [
  {
    id: "truth-cozy-1-appreciation",
    type: "truth",
    mood: "cozy",
    intensity: 1,
    text: "What is one tiny thing your partner does that makes your day easier?",
    followUp: "When did you last notice it?",
  },
  {
    id: "dare-funny-1-award-speech",
    type: "dare",
    mood: "funny",
    intensity: 1,
    text: "Give your partner a wildly sincere 20-second award speech.",
    playContexts: ["meet", "e_meet"],
  },
  {
    id: "couple-question-romantic-2-ritual",
    type: "couple_question",
    mood: "romantic",
    intensity: 2,
    text: "What is a small date-night ritual you would love to repeat?",
  },
  {
    id: "this-or-that-flirty-safe-2-dance-note",
    type: "this_or_that",
    mood: "flirty_safe",
    intensity: 2,
    text: "Slow dance in the kitchen or a secret compliment note?",
  },
  {
    id: "couple-question-cozy-1-perfect-evening",
    type: "couple_question",
    mood: "cozy",
    intensity: 1,
    text: "What would make tonight feel extra easy and sweet?",
  },
  {
    id: "truth-cozy-1-lately-smile",
    type: "truth",
    mood: "cozy",
    intensity: 1,
    text: "What did I do recently that made you smile quietly?",
  },
  {
    id: "dare-cozy-1-compliment",
    type: "dare",
    mood: "cozy",
    intensity: 1,
    text: "Send one specific compliment your partner would not expect.",
    playContexts: ["e_meet"],
  },
  {
    id: "this-or-that-cozy-1-movie-snack",
    type: "this_or_that",
    mood: "cozy",
    intensity: 1,
    text: "Movie night with snacks or a slow walk together?",
  },
  {
    id: "truth-romantic-2-first-soft-moment",
    type: "truth",
    mood: "romantic",
    intensity: 2,
    text: "When was a moment you felt especially close to me?",
  },
  {
    id: "dare-romantic-2-voice-note",
    type: "dare",
    mood: "romantic",
    intensity: 2,
    text: "Send a short voice note saying one thing you adore about your partner.",
    playContexts: ["e_meet"],
  },
  {
    id: "couple-question-deep-2-future-support",
    type: "couple_question",
    mood: "deep",
    intensity: 2,
    text: "What is one future version of us you want to protect?",
    followUp: "What small habit would help us get there?",
  },
  {
    id: "truth-flirty-safe-3-favorite-look",
    type: "truth",
    mood: "flirty_safe",
    intensity: 3,
    text: "What is one look or gesture from me that still gets your attention?",
  },
  {
    id: "dare-flirty-safe-3-date-invite",
    type: "dare",
    mood: "flirty_safe",
    intensity: 3,
    text: "Write your partner a playful two-line invite for your next date.",
    playContexts: ["meet", "e_meet"],
  },
  {
    id: "dare-cozy-1-eye-contact",
    type: "dare",
    mood: "cozy",
    intensity: 1,
    text: "Give your partner a sincere 10-second compliment while making eye contact.",
    playContexts: ["meet"],
  },
  {
    id: "dare-romantic-2-handwritten-note",
    type: "dare",
    mood: "romantic",
    intensity: 2,
    text: "Write a tiny note and hand it to your partner without explaining it first.",
    playContexts: ["meet"],
  },
];
