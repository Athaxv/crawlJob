import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import pc from 'picocolors';

/** A red-only terminal prompt. */
export async function ask(message: string): Promise<string> {
  const terminal = readline.createInterface({ input: stdin, output: stdout });
  try {
    return (await terminal.question(`${pc.bold(pc.red(message))} `)).trim();
  } finally {
    terminal.close();
  }
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** A keyboard-selectable, red-only menu. Use Up/Down and Enter. */
export async function select<T extends string>(
  message: string,
  options: readonly SelectOption<T>[],
): Promise<T> {
  if (options.length === 0) throw new Error('Select menu requires at least one option.');

  // Keep the command usable when input/output has been redirected.
  if (!stdin.isTTY || !stdout.isTTY) {
    const choices = options.map((option, index) => `${index + 1}. ${option.label}`).join(', ');
    const answer = await ask(`${message} (${choices})`);
    const index = Number.parseInt(answer, 10) - 1;
    return options[index]?.value ?? options[0].value;
  }

  let selected = 0;
  const lineCount = options.length + 2;

  const render = (replace = false): void => {
    if (replace) stdout.write(`\x1b[${lineCount}A\r\x1b[J`);
    stdout.write(`${pc.bold(pc.red(message))}\n`);
    stdout.write(`${pc.dim(pc.red('Use ↑ ↓ to choose · Enter to confirm'))}\n`);
    options.forEach((option, index) => {
      const marker = index === selected ? pc.bold(pc.red('❯')) : pc.dim(pc.red(' '));
      const label = index === selected ? pc.bold(pc.red(option.label)) : pc.red(option.label);
      const hint = option.hint ? pc.dim(pc.red(` — ${option.hint}`)) : '';
      stdout.write(`${marker} ${label}${hint}\n`);
    });
  };

  return new Promise<T>((resolve, reject) => {
    const cleanup = (): void => {
      stdin.off('data', onKey);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\x1b[?25h');
    };

    const onKey = (input: Buffer | string): void => {
      const key = input.toString();
      if (key.includes('\u0003')) {
        cleanup();
        reject(Object.assign(new Error('Cancelled.'), { code: 'ABORT_ERR' }));
        return;
      }
      if (key.includes('\u001b[A') || key === 'k') {
        selected = (selected - 1 + options.length) % options.length;
        render(true);
      }
      if (key.includes('\u001b[B') || key === 'j') {
        selected = (selected + 1) % options.length;
        render(true);
      }
      if (key.includes('\r') || key.includes('\n')) {
        const choice = options[selected].value;
        cleanup();
        stdout.write('\n');
        resolve(choice);
      }
    };

    stdout.write('\x1b[?25l');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onKey);
    render();
  });
}
