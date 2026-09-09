import type { Locator, Page } from 'playwright';
import { IS, INTERNSHALA_DOMAIN_RE } from './selectors.js';

export interface InternshalaJob {
  id: string;
  url: string;
  label: string;
}

/** Collect only detail links; this avoids nav/filter links on listing pages. */
export async function getListings(page: Page): Promise<InternshalaJob[]> {
  const links = await page.locator(IS.listingLinks).evaluateAll((anchors) => anchors.map((anchor) => ({
    href: (anchor as HTMLAnchorElement).href,
    text: (anchor.textContent ?? '').replace(/\s+/g, ' ').trim(),
  })));

  const seen = new Set<string>();
  return links.flatMap(({ href, text }) => {
    try {
      const url = new URL(href);
      if (!INTERNSHALA_DOMAIN_RE.test(url.hostname) || !/\/(internships?|jobs?)\/detail\//.test(url.pathname)) return [];
      url.search = '';
      url.hash = '';
      const normalised = url.toString();
      if (seen.has(normalised)) return [];
      seen.add(normalised);
      return [{ id: normalised, url: normalised, label: text || url.pathname }];
    } catch {
      return [];
    }
  });
}

export async function getJobMeta(page: Page): Promise<string> {
  const title = (await page.locator('h1').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  const company = (await page.locator('h2, h3, [class*="company"]').first().innerText().catch(() => ''))
    .replace(/\s+/g, ' ').trim();
  return [title, company].filter(Boolean).join(' — ') || 'Internshala listing';
}

export async function isVisible(locator: Locator): Promise<boolean> {
  return locator.first().isVisible().catch(() => false);
}

/** Only a job-action button can establish the applied state; page text cannot. */
export async function isAlreadyApplied(page: Page): Promise<boolean> {
  const applied = page.getByRole('button', { name: /^(applied|already applied)$/i }).first();
  return applied.isVisible().catch(() => false);
}

/** Internshala routes some applications through the already-saved resume page. */
export async function continueFromResume(page: Page): Promise<boolean> {
  if (!(await isVisible(page.locator(IS.resumeHeading)))) return false;
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }));
  await page.waitForTimeout(500);
  const button = page.locator(IS.resumeContinue).first();
  if (!(await isVisible(button))) return false;
  await button.click();
  await page.waitForTimeout(1200);
  return true;
}

/** Required custom answers are intentionally never filled or submitted. */
export async function hasRequiredCustomFields(page: Page): Promise<boolean> {
  return page.locator('input[required], textarea[required], select[required]').evaluateAll((fields) =>
    fields.some((field) => {
      const control = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if ((control as HTMLInputElement).type === 'hidden' || control.disabled || ('readOnly' in control && control.readOnly)) return false;
      const style = window.getComputedStyle(control);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }),
  ).catch(() => false);
}
