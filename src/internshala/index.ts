import path from 'path';
import 'dotenv/config';
import type { Page } from 'playwright';
import { closeBrowser, getActivePage, launchBrowser, openFirstPage } from '../browser.js';
import * as log from '../logger.js';
import { IS, INTERNSHALA_DOMAIN_RE, INTERNSHALA_INTERNSHIPS_URL, INTERNSHALA_JOBS_URL } from './selectors.js';
import { getJobMeta, getListings, hasRequiredCustomFields, isVisible } from './jobs.js';

export type InternshalaMode = 'internships' | 'jobs' | 'both';

interface Stats {
  applied: number;
  alreadyApplied: number;
  skippedQuestions: number;
  skippedCaptcha: number;
  skippedExternal: number;
  skippedError: number;
}

const newStats = (): Stats => ({ applied: 0, alreadyApplied: 0, skippedQuestions: 0, skippedCaptcha: 0, skippedExternal: 0, skippedError: 0 });

async function screenshot(page: Page, label: string): Promise<string> {
  const dir = path.resolve('screenshots');
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}_is_${label}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch(() => undefined);
  return file;
}

async function processListing(page: Page, url: string, stats: Stats): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForTimeout(800);
  const meta = await getJobMeta(page);
  log.jobDetails(meta);

  if (await isVisible(page.locator(IS.alreadyApplied))) {
    log.skip('Already applied');
    stats.alreadyApplied++;
    return;
  }
  if (await isVisible(page.locator(IS.captcha))) {
    log.skip('CAPTCHA detected');
    stats.skippedCaptcha++;
    return;
  }

  const apply = page.locator(IS.applyButton).first();
  if (!(await isVisible(apply))) {
    log.skip('No Apply Now button found');
    stats.skippedError++;
    return;
  }

  log.step('Opening application form');
  await apply.click();
  await page.waitForTimeout(1200);
  if (!INTERNSHALA_DOMAIN_RE.test(new URL(page.url()).hostname)) {
    log.skip('External application');
    stats.skippedExternal++;
    return;
  }
  if (await isVisible(page.locator(IS.success))) {
    log.success('Application submitted');
    stats.applied++;
    return;
  }
  if (await isVisible(page.locator(IS.captcha))) {
    log.skip('CAPTCHA detected');
    stats.skippedCaptcha++;
    return;
  }
  if (await hasRequiredCustomFields(page)) {
    log.skip('Required application question or field');
    stats.skippedQuestions++;
    return;
  }

  const submit = page.locator(IS.submitButton).first();
  if (!(await isVisible(submit))) {
    const shot = await screenshot(page, 'no_submit');
    log.skip(`Application needs review (no safe submit button). Screenshot: ${shot}`);
    stats.skippedError++;
    return;
  }

  log.step('Submitting application');
  await submit.click();
  const submitted = await page.locator(IS.success).first().waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false);
  if (submitted) {
    log.success('Application submitted');
    stats.applied++;
  } else {
    const shot = await screenshot(page, 'submit_unconfirmed');
    log.error(`Application was not confirmed. Screenshot: ${shot}`);
    stats.skippedError++;
  }
}

async function runCategory(page: Page, name: 'Internships' | 'Jobs', url: string, stats: Stats): Promise<void> {
  log.sectionHeader(name);
  await openFirstPage(page.context(), url);
  log.hint(`Log in and adjust your ${name.toLowerCase()} filters if needed.`);
  await log.waitForEnter(`Press Enter when the ${name.toLowerCase()} results are ready`);
  const listings = await getListings(page);
  if (listings.length === 0) {
    log.info(`No ${name.toLowerCase()} detail links found. Nothing to process.`);
    return;
  }
  log.info(`Found ${listings.length} ${name.toLowerCase()}.`);
  for (let index = 0; index < listings.length; index++) {
    const listing = listings[index];
    log.jobHeader(index + 1, listings.length, listing.url);
    try {
      await processListing(page, listing.url, stats);
    } catch (err) {
      const shot = await screenshot(page, 'unexpected_error');
      log.error(`${(err as Error).message}. Screenshot: ${shot}`);
      stats.skippedError++;
    }
    await page.waitForTimeout(1200);
  }
}

function printSummary(stats: Stats): void {
  log.sectionHeader('Internshala finished');
  log.summaryLine('Submitted', stats.applied, log.tones.success);
  log.summaryLine('Already applied', stats.alreadyApplied, log.tones.muted);
  log.summaryLine('Skipped — required fields', stats.skippedQuestions, log.tones.warn);
  log.summaryLine('Skipped — CAPTCHA', stats.skippedCaptcha, log.tones.error);
  log.summaryLine('Skipped — external', stats.skippedExternal, log.tones.warn);
  log.summaryLine('Skipped — error', stats.skippedError, log.tones.error);
}

export async function run(mode: InternshalaMode = 'both'): Promise<void> {
  log.banner('Internshala');
  const context = await launchBrowser();
  const page = await getActivePage(context);
  const stats = newStats();
  try {
    if (mode === 'internships' || mode === 'both') await runCategory(page, 'Internships', INTERNSHALA_INTERNSHIPS_URL, stats);
    if (mode === 'jobs' || mode === 'both') await runCategory(page, 'Jobs', INTERNSHALA_JOBS_URL, stats);
    printSummary(stats);
  } finally {
    await closeBrowser(context);
  }
}
