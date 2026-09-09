/**
 * crawlJob terminal UI — @clack/prompts + picocolors + ora.
 * Same export surface as before so apply pipelines stay unchanged.
 */

import * as clack from '@clack/prompts';
import pc from 'picocolors';
import ora, { type Ora } from 'ora';

const RED = (s: string) => pc.bold(pc.red(s));

export type SummaryTone = 'success' | 'muted' | 'warn' | 'error';

let activeSpinner: Ora | null = null;

function stopSpinner(final?: 'succeed' | 'fail' | 'warn' | 'stop', text?: string): void {
  if (!activeSpinner) return;
  const s = activeSpinner;
  activeSpinner = null;
  if (final === 'succeed') s.succeed(text);
  else if (final === 'fail') s.fail(text);
  else if (final === 'warn') s.warn(text);
  else {
    s.stop();
    if (text) console.log(text);
  }
}

function startSpinner(message: string): void {
  stopSpinner('stop');
  activeSpinner = ora({
    text: message,
    color: 'red',
    spinner: 'dots',
  }).start();
}

export function banner(subtitle?: string): void {
  stopSpinner('stop');
  const title = RED('crawlJob');
  clack.intro(subtitle ? `${title} ${pc.dim(`· ${subtitle}`)}` : title);
}

export function step(message: string): void {
  startSpinner(message);
}

export function success(message: string): void {
  if (activeSpinner) {
    stopSpinner('succeed', message);
    return;
  }
  clack.log.success(message);
}

export function skip(message: string): void {
  if (activeSpinner) {
    stopSpinner('warn', message);
    return;
  }
  clack.log.warn(message);
}

export function error(message: string): void {
  if (activeSpinner) {
    stopSpinner('fail', message);
    return;
  }
  clack.log.error(message);
}

export function info(message: string): void {
  stopSpinner('stop');
  clack.log.info(pc.dim(message));
}

export function jobHeader(current: number, total: number, label: string): void {
  stopSpinner('stop');
  console.log();
  clack.log.step(`${pc.dim(`[${current}/${total}]`)} ${pc.bold(label)}`);
}

export function sectionHeader(message: string): void {
  stopSpinner('stop');
  console.log();
  clack.log.step(pc.bold(message));
}

function toneColor(tone?: SummaryTone | string): (s: string) => string {
  switch (tone) {
    case 'success':
    case '\x1b[32m':
      return pc.green;
    case 'warn':
    case '\x1b[33m':
      return pc.yellow;
    case 'error':
    case '\x1b[31m':
      return pc.red;
    case 'muted':
    case '\x1b[90m':
      return pc.dim;
    default:
      return (s) => s;
  }
}

export function summaryLine(label: string, value: number, colour?: SummaryTone | string): void {
  stopSpinner('stop');
  const paint = toneColor(colour);
  console.log(`  ${pc.dim(label.padEnd(32, '.'))} ${paint(String(value))}`);
}

export function divider(): void {
  stopSpinner('stop');
  console.log();
}

export function raw(message: string): void {
  stopSpinner('stop');
  const trimmed = message.replace(/^\n+/, '');
  if (!trimmed) {
    console.log();
    return;
  }
  for (const line of message.split('\n')) {
    if (line.length === 0) console.log();
    else clack.log.message(pc.dim(line));
  }
}

export function hint(message: string): void {
  stopSpinner('stop');
  clack.log.message(pc.dim(message));
}

/** Wait for Enter with a clack-styled prompt. */
export async function waitForEnter(message: string): Promise<void> {
  stopSpinner('stop');
  const result = await clack.text({
    message,
    placeholder: 'press Enter',
    defaultValue: '',
  });
  if (clack.isCancel(result)) {
    clack.cancel('Cancelled.');
    process.exit(0);
  }
}

export function outro(message = 'Done'): void {
  stopSpinner('stop');
  clack.outro(pc.dim(message));
}

/** Semantic tones for summary counts (preferred over raw ANSI). */
export const tones = {
  success: 'success' as const,
  muted:   'muted' as const,
  warn:    'warn' as const,
  error:   'error' as const,
};
