# crawlJob

Local Playwright automation for one-click job applications on **Wellfound** and **Instahyre**. Runs in your own browser with your own session — no backend.

Based on [Anshul439/job-auto-apply](https://github.com/Anshul439/job-auto-apply); adapted to run with **Bun**. CLI UI uses `@clack/prompts`, `picocolors`, and `ora`.

## Requirements

- [Bun](https://bun.sh) ≥ 1.0
- Playwright Chromium (installed in setup below). System Chrome/Edge optional via `.env`.

## Setup

```bash
bun install
bunx playwright install chromium
```

Copy `.env.example` to `.env` if you need overrides (`BROWSER_CHANNEL`, `BROWSER_PATH`, pause timings).

**Browser launch stuck on a blank tab?** That means Playwright never finished connecting (you never see `Browser ready`). Close those windows, run `bunx playwright install chromium`, remove `BROWSER_PATH` from `.env`, and if needed delete `~/.crawljob/browser-profile/`.

## Usage

```bash
bun run crawlJob run
```

You’ll get a picker for **Wellfound** or **Instahyre**, then the usual flow (login → filters → Enter → apply).

Skip the picker:

```bash
bun run crawlJob run --site wellfound
bun run crawlJob run --site instahyre
```

Aliases (same as `--site`):

```bash
bun run start:wellfound
bun run start:instahyre
```

**Instahyre:** update `INSTAHYRE_JOBS_URL` in `src/instahyre/selectors.ts` with your filter URL first.

Browser session is stored in `~/.crawljob/browser-profile/` and reused across runs.

## Selectors

- Wellfound: `src/wellfound/selectors.ts`
- Instahyre: `src/instahyre/selectors.ts`
