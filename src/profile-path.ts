import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function getProfilePath(): string {
  const configured = process.env.CRAWLJOB_PROFILE_PATH?.trim();
  return configured ? path.resolve(configured) : path.join(ROOT, '.crawljob', 'profile.json');
}
