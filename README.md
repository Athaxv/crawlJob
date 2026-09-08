# crawlJob

Local Playwright automation for one-click job applications on **Wellfound** and **Instahyre**. Runs in your own browser with your own session — no backend.

Based on [Anshul439/job-auto-apply](https://github.com/Anshul439/job-auto-apply); adapted to run with **Bun**.

## Requirements

- [Bun](https://bun.sh) ≥ 1.0
- Brave, Chrome, or Chromium (optional — auto-detected)

## Setup

```bash
bun install
bunx playwright install chromium
```

Copy `.env.example` to `.env` if you need overrides (`BROWSER_PATH`, pause timings).

## Usage

**Wellfound:**

```bash
bun run start:wellfound
```

1. Browser opens — log in if needed  
2. Set filters and open job results  
3. Press **ENTER** in the terminal  

**Instahyre:**

Update `INSTAHYRE_JOBS_URL` in `src/instahyre/selectors.ts` with your filter URL, then:

```bash
bun run start:instahyre
```

Browser session is stored in `~/.crawljob/browser-profile/` and reused across runs.

## Selectors

- Wellfound: `src/wellfound/selectors.ts`
- Instahyre: `src/instahyre/selectors.ts`
