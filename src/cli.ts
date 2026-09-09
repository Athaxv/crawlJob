#!/usr/bin/env node
import pc from 'picocolors';
import { select } from './prompt.js';

type Site = 'wellfound' | 'instahyre' | 'internshala';
type InternshalaMode = 'internships' | 'jobs' | 'both';

function usage(): never {
  const name = pc.bold(pc.red('crawlJob'));
  console.log(`
${name} — local job auto-apply

Usage:
  bun run crawlJob run
  bun run crawlJob run --site wellfound
  bun run crawlJob run --site instahyre
  bun run crawlJob run --site internshala --type internships|jobs|both

Options:
  --site <wellfound|instahyre|internshala>   Skip the interactive picker
  --type <internships|jobs|both>             Internshala mode
`);
  process.exit(1);
}

function parseArgs(argv: string[]): { command?: string; site?: Site; internshalaMode?: InternshalaMode } {
  const args = argv.slice(2);
  const command = args[0];
  let site: Site | undefined;
  let internshalaMode: InternshalaMode | undefined;

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '--site') {
      const value = args[++i]?.toLowerCase();
      if (value !== 'wellfound' && value !== 'instahyre' && value !== 'internshala') {
        console.error(pc.red(`Invalid --site value: ${value ?? '(missing)'}`));
        usage();
      }
      site = value;
    } else if (a.startsWith('--site=')) {
      const value = a.slice('--site='.length).toLowerCase();
      if (value !== 'wellfound' && value !== 'instahyre' && value !== 'internshala') {
        console.error(pc.red(`Invalid --site value: ${value}`));
        usage();
      }
      site = value;
    } else if (a === '--type' || a.startsWith('--type=')) {
      const value = (a === '--type' ? args[++i] : a.slice('--type='.length))?.toLowerCase();
      if (value !== 'internships' && value !== 'jobs' && value !== 'both') {
        console.error(pc.red(`Invalid --type value: ${value ?? '(missing)'}`));
        usage();
      }
      internshalaMode = value;
    }
  }

  if (internshalaMode && site && site !== 'internshala') {
    console.error(pc.red('--type is available only with --site internshala.'));
    usage();
  }
  return { command, site, internshalaMode };
}

async function pickSite(): Promise<Site> {
  return select('Choose a site', [
    { value: 'wellfound', label: 'Wellfound', hint: 'one-click Easy Apply' },
    { value: 'instahyre', label: 'Instahyre', hint: 'candidate opportunities' },
    { value: 'internshala', label: 'Internshala', hint: 'internships and jobs' },
  ]);
}

async function pickInternshalaMode(): Promise<InternshalaMode> {
  return select('Choose Internshala type', [
    { value: 'internships', label: 'Internships', hint: 'process internship listings' },
    { value: 'jobs', label: 'Jobs', hint: 'process job listings' },
    { value: 'both', label: 'Both', hint: 'internships first, then jobs' },
  ]);
}

async function runSite(site: Site, internshalaMode?: InternshalaMode): Promise<void> {
  if (site === 'wellfound') {
    const mod = await import('./wellfound/index.js');
    await mod.run();
    return;
  }

  if (site === 'internshala') {
    const mod = await import('./internshala/index.js');
    await mod.run(internshalaMode ?? await pickInternshalaMode());
    return;
  }

  const mod = await import('./instahyre/index.js');
  await mod.run();
}

async function main(): Promise<void> {
  const { command, site: siteFlag, internshalaMode } = parseArgs(process.argv);

  if (command !== 'run') {
    usage();
  }

  const site = siteFlag ?? (await pickSite());
  await runSite(site, internshalaMode);
}

main().catch((err) => {
  if ((err as { code?: string }).code === 'ABORT_ERR') {
    console.log(pc.red('Cancelled.'));
    process.exit(0);
  }
  console.error('\nFatal error:', err);
  process.exit(1);
});
