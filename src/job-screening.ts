import fs from 'node:fs';
import { getProfilePath } from './profile-path.js';

interface Preferences {
  roles?: string[];
  jobTypes?: string[];
  experienceLevel?: 'fresher' | 'entry' | 'mid' | 'senior' | 'any';
  yearsOfExperience?: number | null;
  locationPreference?: string;
}
interface UserProfile { jobPreferences?: Preferences; }
export interface ScreeningResult { eligible: boolean; reason: string; }

export function screenJob(title: string, description: string, listingType?: string): ScreeningResult {
  let preferences: Preferences | undefined;
  try { preferences = (JSON.parse(fs.readFileSync(getProfilePath(), 'utf8').replace(/^\uFEFF/, '')) as UserProfile).jobPreferences; } catch { /* no profile */ }
  if (!preferences?.roles?.length || !preferences.experienceLevel || !preferences.jobTypes?.length) {
    return { eligible: false, reason: 'Job profile is missing; run `crawlJob profile` to configure filters.' };
  }
  const text = `${title} ${description}`.toLowerCase();
  const roleTitle = title.toLowerCase();
  const roleMatches = preferences.roles.some((role) => {
    const normalized = role.toLowerCase().trim();
    return normalized && (roleTitle.includes(normalized) || normalized.split(/\s+/).filter((word) => word.length > 2).some((word) => roleTitle.includes(word)));
  });
  if (!roleMatches) return { eligible: false, reason: `Role does not match target roles: ${preferences.roles.join(', ')}` };

  const level = preferences.experienceLevel;
  const seniorRole = /\b(senior|sr\.?|staff|principal|lead|manager|director|head of)\b/i.test(title);
  if ((level === 'fresher' || level === 'entry') && seniorRole) return { eligible: false, reason: 'Role title requires seniority above the configured experience level.' };
  const years = [...description.matchAll(/(?:minimum|min\.?|at least|\b)\s*(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:relevant\s+)?experience/gi)]
    .map((match) => Number(match[1]));
  if (preferences.yearsOfExperience != null && years.some((required) => required > preferences!.yearsOfExperience!)) {
    return { eligible: false, reason: `Description asks for ${Math.max(...years)} years of experience; profile has ${preferences.yearsOfExperience}.` };
  }

  const desiredTypes = preferences.jobTypes.map((type) => type.toLowerCase());
  const typeText = `${listingType ?? ''} ${title} ${description.slice(0, 1500)}`.toLowerCase();
  const locationPreference = preferences.locationPreference?.trim().toLowerCase();
  if (locationPreference === 'remote' && !/\b(remote|work from home|wfh|distributed)\b/i.test(typeText)) {
    return { eligible: false, reason: 'Remote-only location preference does not match this listing.' };
  }
  if (locationPreference && locationPreference !== 'any' && locationPreference !== 'remote'
      && !typeText.includes(locationPreference) && !/\b(remote|work from home|wfh|distributed)\b/i.test(typeText)) {
    return { eligible: false, reason: `Listing does not mention preferred location: ${preferences.locationPreference}.` };
  }
  const inferredType = /\bintern(ship)?\b/.test(typeText) ? 'internship'
    : /\bpart[- ]time\b/.test(typeText) ? 'part-time'
    : /\b(contract|contractor|freelance)\b/.test(typeText) ? 'contract'
    : /\b(full[- ]time|permanent)\b/.test(typeText) ? 'full-time' : undefined;
  if (!desiredTypes.includes('any') && inferredType && !desiredTypes.includes(inferredType)) {
    return { eligible: false, reason: `Job type is ${inferredType}; accepted types: ${desiredTypes.join(', ')}.` };
  }
  return { eligible: true, reason: 'Matches configured role and experience filters.' };
}
