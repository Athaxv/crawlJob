#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const compiler = path.join(projectDir, 'node_modules', 'typescript', 'bin', 'tsc');

const build = spawnSync(process.execPath, [compiler], {
  cwd: projectDir,
  stdio: 'inherit',
});

if (build.status !== 0) process.exit(build.status ?? 1);

const app = spawnSync(process.execPath, [path.join(projectDir, 'dist', 'cli.js'), ...process.argv.slice(2)], {
  cwd: projectDir,
  stdio: 'inherit',
});

process.exit(app.status ?? 1);
