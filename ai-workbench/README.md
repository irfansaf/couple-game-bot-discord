# AI Workbench

Use this folder for AI Engineer prompt evaluation work. Live Discord play can also store generated AI output in Postgres when `AI_CAPTURE_OUTPUTS=true`; this local folder remains useful for exports, sanitized samples, and one-off manual validation.

## Folders

- `generated/`: local generated AI output captures or exports from Postgres. This folder is gitignored except `.gitkeep`.
- `reports/`: local validation reports from `bun run ai:validate`. This folder is gitignored except `.gitkeep`.
- `samples/`: committed sanitized examples that are safe to share in git.

## Capture Format

Drop `.json` files into `generated/`. The validator accepts:

- Raw generated batch JSON:

```json
{
  "questions": [
    {
      "type": "couple_question",
      "mood": "romantic",
      "intensity": 2,
      "question": "What is one small ritual you want us to repeat?",
      "followUp": "What makes it feel like us?",
      "safetyNotes": []
    }
  ]
}
```

- A single generated question object.
- An OpenAI-compatible chat completion response where `choices[0].message.content` contains the generated JSON.
- An envelope like `{ "content": "{...json...}" }`.

## Validation

```bash
bun run ai:validate
```

By default this reads `ai-workbench/generated` and writes `ai-workbench/reports/latest-validation.json`.

You can pass custom paths:

```bash
bun run ai:validate ai-workbench/samples ai-workbench/reports/samples-validation.json
```

## Live Research Report

When `AI_CAPTURE_OUTPUTS=true`, live Discord session captures are stored in Postgres. Summarize them without printing raw generated prompt content:

```bash
bun run ai:report
bun run ai:report -- --since all --limit 20
bun run ai:report -- --json
```

## Privacy

Do not put private answers, Discord user content, tokens, or raw sensitive logs here. Keep local generated output out of git unless it is sanitized and intentionally moved to `samples/`.
