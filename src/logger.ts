/** Red-only terminal output. */
import pc from 'picocolors';
import ora, { type Ora } from 'ora';
import { ask } from './prompt.js';

const RED = (text: string) => pc.bold(pc.red(text));
const SOFT_RED = (text: string) => pc.dim(pc.red(text));

export type SummaryTone = 'success' | 'muted' | 'warn' | 'error';

let activeSpinner: Ora | null = null;

function stopSpinner(text?: string): void {
  if (!activeSpinner) return;
  activeSpinner.stop();
  activeSpinner = null;
  if (text) console.log(RED(text));
}

function startSpinner(message: string): void {
  stopSpinner();
  activeSpinner = ora({ text: message, color: 'red', spinner: 'dots' }).start();
}

export function banner(subtitle?: string): void {
  stopSpinner();
  console.log(RED(subtitle ? `crawlJob - ${subtitle}` : 'crawlJob'));
}

export function step(message: string): void { startSpinner(message); }

export function success(message: string): void {
  if (activeSpinner) return stopSpinner(`✓ ${message}`);
  console.log(RED(`✓ ${message}`));
}

export function skip(message: string): void {
  if (activeSpinner) return stopSpinner(`↷ ${message}`);
  console.log(RED(`↷ ${message}`));
}

export function error(message: string): void {
  if (activeSpinner) return stopSpinner(`× ${message}`);
  console.error(RED(`× ${message}`));
}

export function info(message: string): void {
  stopSpinner();
  console.log(SOFT_RED(`   ↳ ${message}`));
}

export function jobHeader(current: number, total: number, label: string): void {
  stopSpinner();
  console.log();
  const progress = `${String(current).padStart(String(total).length, '0')}/${total}`;
  const displayLabel = label.startsWith('http')
    ? (() => {
        try {
          const url = new URL(label);
          return `${url.host}${url.pathname}`;
        } catch {
          return label;
        }
      })()
    : label;
  console.log(RED(`┌─ JOB ${progress}`));
  console.log(SOFT_RED(`└─ ${displayLabel}`));
}

/** Prints the role/company context directly beneath the current job header. */
export function jobDetails(message: string): void {
  stopSpinner();
  console.log(RED(`   ${message}`));
}

export function sectionHeader(message: string): void {
  stopSpinner();
  console.log();
  console.log(RED(message));
}

export function summaryLine(label: string, value: number, _colour?: SummaryTone | string): void {
  stopSpinner();
  console.log(RED(`  ${label.padEnd(32, '.')} ${value}`));
}

export function divider(): void {
  stopSpinner();
  console.log();
}

export function raw(message: string): void {
  stopSpinner();
  for (const line of message.replace(/^\n+/, '').split('\n')) console.log(line ? RED(line) : '');
}

export function hint(message: string): void {
  stopSpinner();
  console.log(RED(message));
}

export async function waitForEnter(message: string): Promise<void> {
  stopSpinner();
  await ask(`${message} (press Enter)`);
}

export function outro(message = 'Done'): void {
  stopSpinner();
  console.log(RED(message));
}

export const tones = {
  success: 'success' as const,
  muted: 'muted' as const,
  warn: 'warn' as const,
  error: 'error' as const,
};
