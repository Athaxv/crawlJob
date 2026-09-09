import path from 'path';
import os from 'os';
import fs from 'fs';
import { chromium, type BrowserContext, type Page } from 'playwright';
import * as log from './logger.js';

/** Where the persistent browser profile is stored. */
const PROFILE_DIR = path.join(os.homedir(), '.crawljob', 'browser-profile');

const LAUNCH_TIMEOUT_MS = 60_000;

type BrowserLaunchTarget =
  | { kind: 'bundled' }
  | { kind: 'executable'; path: string }
  | { kind: 'channel'; channel: 'chrome' | 'msedge' };

type PersistentLaunchOptions = NonNullable<Parameters<typeof chromium.launchPersistentContext>[1]>;

/**
 * Resolves which browser to launch.
 *
 * Default: Playwright's bundled Chromium (most reliable CDP match).
 * Overrides:
 *   BROWSER_PATH=/path/to/browser.exe
 *   BROWSER_CHANNEL=chrome|msedge   (Playwright-managed system browser)
 */
function resolveLaunchTarget(): BrowserLaunchTarget {
  const channel = process.env.BROWSER_CHANNEL?.trim().toLowerCase();
  if (channel === 'chrome' || channel === 'msedge') {
    return { kind: 'channel', channel };
  }

  const envPath = process.env.BROWSER_PATH?.trim();
  if (envPath) {
    if (fs.existsSync(envPath)) {
      return { kind: 'executable', path: envPath };
    }
    log.error(`BROWSER_PATH does not exist: ${envPath}`);
    log.info('Falling back to Playwright Chromium. Run: bunx playwright install chromium');
  }

  return { kind: 'bundled' };
}

function describeTarget(target: BrowserLaunchTarget): string {
  if (target.kind === 'bundled') return 'Playwright Chromium';
  if (target.kind === 'channel') return `channel:${target.channel}`;
  return target.path;
}

/**
 * Launches a persistent browser context so the existing login session
 * is reused across runs.
 *
 * Note: Playwright always starts on about:blank — call openFirstPage next.
 */
export async function launchBrowser(): Promise<BrowserContext> {
  const target = resolveLaunchTarget();

  log.step(`Using browser profile: ${PROFILE_DIR}`);
  log.step(`Using browser: ${describeTarget(target)}`);

  const options: PersistentLaunchOptions = {
    headless: false,
    viewport: { width: 1440, height: 900 },
    slowMo: 80,
    timeout: LAUNCH_TIMEOUT_MS,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
    ],
  };

  if (target.kind === 'executable') {
    options.executablePath = target.path;
  } else if (target.kind === 'channel') {
    options.channel = target.channel;
  }

  try {
    const context = await chromium.launchPersistentContext(PROFILE_DIR, options);
    log.success('Browser ready');
    return context;
  } catch (err) {
    const message = (err as Error).message;
    log.error(`Browser launch failed: ${message}`);
    log.info('Close every Chrome/Chromium window opened by crawlJob, then try:');
    log.info(`  1. bunx playwright install chromium`);
    log.info(`  2. Remove BROWSER_PATH from .env (use bundled Chromium)`);
    log.info(`  3. Delete profile: ${PROFILE_DIR}`);
    throw err;
  }
}

/**
 * Returns a usable page: prefer one that is not about:blank, else first/new.
 */
export async function getActivePage(context: BrowserContext): Promise<Page> {
  const pages = context.pages();
  const nonBlank = pages.find((p) => {
    const u = p.url();
    return u && u !== 'about:blank';
  });
  if (nonBlank) return nonBlank;
  return pages.length > 0 ? pages[0] : context.newPage();
}

function isBlankUrl(url: string): boolean {
  return !url || url === 'about:blank' || url === 'chrome://newtab/';
}

/**
 * Navigates the active page off about:blank to `url`.
 * Throws if navigation fails or the page is still blank.
 */
export async function openFirstPage(
  context: BrowserContext,
  url: string,
  options?: { skipIfHostIncludes?: string },
): Promise<Page> {
  const page = await getActivePage(context);
  const current = page.url();

  if (
    options?.skipIfHostIncludes &&
    !isBlankUrl(current) &&
    current.includes(options.skipIfHostIncludes)
  ) {
    log.info(`Already on ${current}`);
    return page;
  }

  log.step(`Navigating to ${url}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  } catch (firstErr) {
    log.info(`First navigation attempt failed, retrying with waitUntil=load…`);
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
    } catch (secondErr) {
      log.error(`Failed to open ${url}: ${(secondErr as Error).message}`);
      log.info(`Current page: ${page.url()}`);
      throw secondErr;
    }
  }

  const finalUrl = page.url();
  if (isBlankUrl(finalUrl)) {
    const err = new Error(`Navigation left the page blank (still on ${finalUrl || 'about:blank'})`);
    log.error(err.message);
    throw err;
  }

  log.success(`Opened ${finalUrl}`);
  return page;
}

export async function closeBrowser(context: BrowserContext): Promise<void> {
  await context.close();
}
