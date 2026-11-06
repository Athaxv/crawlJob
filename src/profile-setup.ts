import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { ask, select } from './prompt.js';
import { getProfilePath } from './profile-path.js';

type ExperienceLevel = 'fresher' | 'entry' | 'mid' | 'senior' | 'any';
type JobType = 'full-time' | 'internship' | 'part-time' | 'contract' | 'any';

interface StoredProfile {
  [key: string]: unknown;
  jobPreferences?: { roles?: string[]; jobTypes?: JobType[]; experienceLevel?: ExperienceLevel; yearsOfExperience?: number | null; locationPreference?: string };
}

function readProfile(profileFile: string): StoredProfile {
  try {
    return JSON.parse(fs.readFileSync(profileFile, 'utf8').replace(/^\uFEFF/, '')) as StoredProfile;
  } catch {
    return {};
  }
}

function commaList(value: string): string[] {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
}

export function isProfileConfigured(profileFile = getProfilePath()): boolean {
  try {
    const preferences = (JSON.parse(fs.readFileSync(profileFile, 'utf8').replace(/^\uFEFF/, '')) as StoredProfile).jobPreferences;
    return Boolean(preferences?.roles?.length && preferences.experienceLevel && preferences.jobTypes?.length);
  } catch { return false; }
}

export async function configureProfile(profileFile = getProfilePath()): Promise<void> {
  const current = readProfile(profileFile);
  const previous = current.jobPreferences;

  console.log(pc.bold(pc.red('\nSet your job search profile')));
  console.log(pc.dim(`Preferences will be saved in ${profileFile}.`));

  const rolesInput = await ask(`Target roles (enter or paste all roles separated by commas)${previous?.roles?.length ? ` [${previous.roles.join(', ')}]` : ''}:`);
  const roles = rolesInput ? commaList(rolesInput) : previous?.roles ?? [];
  if (roles.length === 0) throw new Error('Please enter at least one target role.');

  const levelOptions: { value: ExperienceLevel; label: string; hint: string }[] = [
    { value: 'fresher', label: 'Fresher', hint: 'no full-time experience / graduate roles' },
    { value: 'entry', label: 'Entry level', hint: 'early career' },
    { value: 'mid', label: 'Mid level', hint: 'experienced individual contributor' },
    { value: 'senior', label: 'Senior', hint: 'senior or lead roles' },
    { value: 'any', label: 'Any level', hint: 'do not filter by level' },
  ];
  const experienceLevel = await select('Your experience level', levelOptions);

  const locationChoice = await select('Location preference', [
    { value: 'any', label: 'Any location', hint: 'include remote and onsite opportunities everywhere' },
    { value: 'remote', label: 'Remote only', hint: 'exclude roles requiring onsite work' },
    { value: 'specific', label: 'Specific location', hint: 'enter a city, region, or country' },
  ] as const);
  const locationPreference = locationChoice === 'specific'
    ? (await ask('Preferred location (city, region, or country):')).trim()
    : locationChoice;
  if (!locationPreference) throw new Error('Enter a location or choose Any location / Remote only.');

  const typeOptions: { value: JobType; label: string; hint?: string }[] = [
    { value: 'full-time', label: 'Full-time' },
    { value: 'internship', label: 'Internship' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'any', label: 'Any job type', hint: 'accept all types' },
  ];
  const typesInput = await ask('Job types (comma-separated: full-time, internship, part-time, contract, any):');
  const requestedTypes = commaList(typesInput.toLowerCase()) as JobType[];
  const jobTypes = requestedTypes.filter((type) => typeOptions.some((option) => option.value === type));
  if (jobTypes.length === 0) throw new Error('Enter at least one valid job type.');
  const normalizedTypes: JobType[] = jobTypes.includes('any') ? ['any'] : [...new Set(jobTypes)];

  const yearsInput = await ask('Years of relevant experience (0 or a number; leave blank if unknown):');
  const yearsOfExperience = yearsInput.trim() ? Number(yearsInput) : null;
  if (yearsOfExperience !== null && (!Number.isFinite(yearsOfExperience) || yearsOfExperience < 0)) {
    throw new Error('Years of experience must be a non-negative number.');
  }

  const expectedSalaryInput = await ask(`Expected salary (optional; include currency and period, e.g. INR 12 LPA)${typeof current.expectedSalary === 'string' ? ` [${current.expectedSalary}]` : ''}:`);
  const expectedSalary = expectedSalaryInput || (typeof current.expectedSalary === 'string' ? current.expectedSalary : undefined);

  current.jobPreferences = { roles, jobTypes: normalizedTypes, experienceLevel, yearsOfExperience, locationPreference };
  if (expectedSalary) current.expectedSalary = expectedSalary;
  fs.mkdirSync(path.dirname(profileFile), { recursive: true });
  fs.writeFileSync(profileFile, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  console.log(pc.green(`\nSaved job preferences to ${profileFile}`));
}
