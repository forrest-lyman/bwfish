# @bwfish/server

Server-side feed processing pipeline and CLI tools for BW Fish. Claims feed entries from Firestore, runs moderation, and dispatches to type-specific handlers (questions, observations, corrections).

## Setup

Create `private/.env` in this package (gitignored):

```env
OPENAI_API_KEY=...
FIREBASE_ADMIN_KEY=private/your-firebase-adminsdk.json
BWFISH_ADMIN_UID=...
```

`FIREBASE_ADMIN_KEY` can be:

- A path relative to `private/` (with or without a `private/` prefix)
- An absolute path
- Inline JSON credentials

The CLI loads this file automatically via dotenv on startup.

Install dependencies from the repo root:

```bash
pnpm install
```

## CLI

Entry point: `src/cli.ts` (`bwfish-server`)

Run from the repo root:

```bash
pnpm --filter @bwfish/server dev -- feed process
pnpm --filter @bwfish/server dev -- agent test
```

Or from this package:

```bash
pnpm dev feed process
pnpm dev agent test
```

Show help:

```bash
pnpm dev -- --help
pnpm dev -- feed --help
pnpm dev -- feed process --help
pnpm dev -- agent --help
```

### `feed process`

Claim and process the next new feed entry. Each entry runs through user validation, moderation, and the appropriate module pipeline.

```bash
pnpm dev feed process
pnpm dev feed process -n 5
pnpm dev feed process -n 5 -y
```

| Option | Description |
|--------|-------------|
| `-n, --count <count>` | Number of entries to process (default: `1`) |
| `-y, --yes` | Skip confirmation when `--count` is greater than 1 |

Processing stops early when no new entries remain. Entries with status `new` are claimed atomically and set to `pending` before the pipeline runs.

Supported feed types: `question`, `observation`, `correction`.

### `agent test`

Run an agent interactively for local testing. Prompts for agent selection and a message, with preferences saved to `private/server-test.json`.

```bash
pnpm dev agent test
```

Choose **Auto (orchestrator)** to route a message through the orchestrator, or pick a specific agent (e.g. Pacific Northwest Bar Reporter).

## Library

The pipeline is also exported for programmatic use:

```ts
import { run, runNext } from '@bwfish/server';

const entry = await runNext(); // claim + process one entry
await run(entry);              // process a specific entry
```

## Layout

```
src/
  cli.ts              Commander CLI
  actions/            Command handlers
  env.ts              dotenv + path helpers
  lib/                Pipeline, clients, shared services
  modules/            question, observation, correction handlers
  private/            Local secrets and config (gitignored)
```
