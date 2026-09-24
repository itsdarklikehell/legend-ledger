# Legend Ledger

**Legend Ledger** is an unofficial, local-first digital character sheet and play companion for **Legend in the Mist**.

Build and manage Heroes, invoke tags directly from the sheet, roll actions and reactions, track statuses and story tags, develop themes, manage Fellowship, Camp & Sojourn, Promise, Moments of Fulfillment, and Quintessences — all without accounts or a server.

Legend Ledger follows the game's narrative-first spirit: **standard rules are presented as useful defaults, not hard restrictions**. Tables can still make rulings, add custom material, and play their own way.

> This is an unofficial fan-made companion and is not affiliated with or endorsed by Son of Oak. It does not include the Core Book, Character Pack, pregen artwork, or rules text intended to replace the game books.

## Features

- Responsive character sheet for desktop, tablet, and mobile
- Multiple locally stored Heroes with switching, duplication, import, and export
- Hero creation with Origin, Adventure, Greatness, variable/custom Might, and flexible theme counts
- Power tags, weakness tags, Quests, Special Improvements, and theme development
- Quick, Detailed, Sacrifice, and Reaction roll support
- Direct tag/status invocation from the sheet with helpful and hindering polarity
- Burn-for-Power, rule-aware warnings, and table-ruling overrides instead of hard locks
- Backpack, scene story tags, statuses, world tags, and Chronicle tracking
- Fellowship themes, relationships, development, and Quality Time
- Camp & Sojourn workflows including Rest, Reflect, Camp Actions, and Safe Havens
- Promise, Moments of Fulfillment, Journey's End, Reforging, and Quintessences
- Scene/session use tracking for supported Specials and Quintessences
- Undo/redo and versioned Hero JSON exports
- Built-in How to Play reference folio
- Local-first storage with no account or backend required

## Narrative-first rules support

Legend Ledger automates bookkeeping where that is useful, while leaving fictional judgment with the table.

The app may point out when a choice differs from the standard rules — for example, burning multiple tags or reusing a tag in an immediate reaction — but it generally **does not prevent the choice**. This keeps the sheet useful for house rules, edge cases, Narrator rulings, and intentionally non-RAW play.

The app intentionally does not adjudicate fictional relevance, Consequences, Quest interpretation, or every unusual Might interaction.

## Using the sheet

- **Click/tap** a tag or status to invoke its normal polarity.
- **Shift/Alt-click, right-click, or long-press** to invoke the opposite polarity.
- Invoking something opens the Action folio and adds it to the current roll.
- Click a contribution in the Action folio to flip its polarity.
- Use the scratch/burn control where appropriate, or remove a contribution with `×`.
- `Enter` rolls while the action description is focused.
- `Esc` clears the current action selection.
- `Ctrl/Cmd+Z` undoes; `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y` redoes.

## Inline Mist notation

Supported free-text fields can render lightweight game notation:

```text
{power-tag}
{!weakness-tag}
{status-3}
{limit:5}
```

Rendered tags and statuses can be interacted with when they appear on the live sheet.

## Data and privacy

Legend Ledger is local-first:

- Character data is stored in browser `localStorage`.
- The project does not send character data to a server.
- Portraits are stored with character data, so very large images may exceed browser storage limits.
- Hero exports use the versioned `legend-ledger-hero` JSON format.

Export important Heroes periodically if you rely on browser storage long-term.

## Development

### Requirements

- Node.js
- pnpm

### Run locally

```bash
pnpm install
pnpm dev
```

### Checks

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

`pnpm build` runs the TypeScript check before creating the production bundle.

## Tech stack

- Preact 10
- TypeScript 6
- Vite 8
- Oxlint
- Oxfmt

## Project structure

```text
src/
  components/   UI and game components
  data/         themebooks and advancement catalogs
  lib/          rules, storage, preferences, and text parsing
  styles/       visual system and responsive layouts
  App.tsx       application state and orchestration
public/assets/   project artwork and attributed texture assets
```

## Scope

Legend Ledger is primarily a **player-facing companion**. Dedicated Narrator/Challenge management, multiplayer synchronization, and full automation of every optional Way of Magic are outside the current scope.

Custom themes, tags, Specials, Quintessences, Might choices, and manual corrections remain available so unusual characters and table rulings can still be represented.

## Third-party assets

Third-party texture/icon attribution is documented in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

No Foundry compendium content, pregenerated-character artwork, or game-book content intended to replace the official books is bundled.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for development and contribution guidance.

## License

No project-wide license has been selected yet. Until one is added, the absence of a license should not be interpreted as permission to redistribute or reuse the original Legend Ledger source or artwork.

## :film_projector: Development visualization

Bekijk de [Gource development video](https://github.com/itsdarklikehell/legend-ledger/releases) voor een visuele tijdlijn van de projectgeschiedenis.

Om de video lokaal te genereren:
```bash
gource -1920x1080 --auto-skip-seconds 1 -o gource.ppm
ffmpeg -y -r 60 -i gource.ppm -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p gource.mp4
```

De GitHub Actions workflow (`.github/workflows/gource.yaml`) genereert de video automatisch bij elke release.
