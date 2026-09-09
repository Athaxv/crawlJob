# crawlJob

Local Playwright automation for one-click job applications on **Wellfound** and **Instahyre**. Runs in your own browser with your own session — no backend.

Based on [Anshul439/job-auto-apply](https://github.com/Anshul439/job-auto-apply); adapted to run with **Bun** or Node. CLI UI uses `picocolors` and `ora`.

## Requirements

- [Bun](https://bun.sh) ≥ 1.0
- Playwright Chromium (installed in setup below). System Chrome/Edge optional via `.env`.

## Setup

```bash
bun install
bunx playwright install chromium
```

Copy `.env.example` to `.env` if you need overrides (`BROWSER_CHANNEL`, `BROWSER_PATH`, `BROWSER_PROFILE_DIR`, pause timings).

**Browser launch stuck on a blank tab?** The browser profile may be locked or unwritable. Close crawlJob browser windows, then remove the local `.crawljob/browser-profile/` directory and retry. The browser must print `Browser ready` before it can navigate.

## Usage

After registering the local command once with `npm link`, run it from any PowerShell window:

```bash
crawlJob run
crawlJob run --site wellfound
crawlJob run --site instahyre
crawlJob run --site internshala --type internships
crawlJob run --site internshala --type jobs
crawlJob run --site internshala --type both
```

You can also run it from this project with Bun:

```bash
bun run crawlJob run
```

You’ll get a picker for **Wellfound**, **Instahyre**, or **Internshala**, then the usual flow (login → filters → Enter → apply).

**Internshala:** supports **Internships**, **Jobs**, or **Both**. Set `INTERNSHALA_INTERNSHIPS_URL` and `INTERNSHALA_JOBS_URL` in `.env` to your saved, filtered results pages. The runner submits only applications without visible required custom fields; it skips questions, CAPTCHA, external applications, and unconfirmed submissions.

Skip the picker:

```bash
bun run crawlJob run --site wellfound
bun run crawlJob run --site instahyre
bun run crawlJob run --site internshala --type both
```

Aliases (same as `--site`):

```bash
bun run start:wellfound
bun run start:instahyre
```

**Instahyre:** update `INSTAHYRE_JOBS_URL` in `src/instahyre/selectors.ts` with your filter URL first.

Browser session is stored in `.crawljob/browser-profile/` in this project and reused across runs. This folder is ignored by Git. Set `BROWSER_PROFILE_DIR` only if you intentionally want a different location.

## Selectors

- Wellfound: `src/wellfound/selectors.ts`
- Instahyre: `src/instahyre/selectors.ts`
- Internshala: `src/internshala/selectors.ts`
