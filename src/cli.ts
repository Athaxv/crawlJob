#!/usr/bin/env bun
import * as clack from '@clack/prompts';
import pc from 'picocolors';

type Site = 'wellfound' | 'instahyre';

function usage(): never {
  const name = pc.bold(pc.red('crawlJob'));
  console.log(`
${name} — local job auto-apply

Usage:
  bun run crawlJob run
  bun run crawlJob run --site wellfound
  bun run crawlJob run --site instahyre

Options:
  --site <wellfound|instahyre>   Skip the interactive picker
`);
  process.exit(1);
}

function parseArgs(argv: string[]): { command?: string; site?: Site } {
  const args = argv.slice(2);
  const command = args[0];
  let site: Site | undefined;

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '--site') {
      const value = args[++i]?.toLowerCase();
      if (value !== 'wellfound' && value !== 'instahyre') {
        console.error(pc.red(`Invalid --site value: ${value ?? '(missing)'}`));
        usage();
      }
      site = value;
    } else if (a.startsWith('--site=')) {
      const value = a.slice('--site='.length).toLowerCase();
      if (value !== 'wellfound' && value !== 'instahyre') {
        console.error(pc.red(`Invalid --site value: ${value}`));
        usage();
      }
      site = value;
    }
  }

  return { command, site };
}

async function pickSite(): Promise<Site> {
  const choice = await clack.select({
    message: 'Which site do you want to run?',
    options: [
      { value: 'wellfound', label: 'Wellfound', hint: 'one-click Easy Apply' },
      { value: 'instahyre', label: 'Instahyre', hint: 'candidate opportunities' },
    ],
  });

  if (clack.isCancel(choice)) {
    clack.cancel('Cancelled.');
    process.exit(0);
  }

  return choice as Site;
}

async function runSite(site: Site): Promise<void> {
  if (site === 'wellfound') {
    const mod = await import('./wellfound/index.js');
    await mod.run();
    return;
  }

  const mod = await import('./instahyre/index.js');
  await mod.run();
}

async function main(): Promise<void> {
  const { command, site: siteFlag } = parseArgs(process.argv);

  if (command !== 'run') {
    usage();
  }

  const site = siteFlag ?? (await pickSite());
  await runSite(site);
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
