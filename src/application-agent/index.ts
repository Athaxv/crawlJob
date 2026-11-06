import fs from 'fs';
import path from 'path';
import type { Locator } from 'playwright';
import * as log from '../logger.js';
import { getProfilePath } from '../profile-path.js';

export type AgentMode = 'review' | 'fill' | 'auto-submit';
export type AgentResult = 'filled' | 'review_required' | 'blocked';

interface Profile {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: Record<string, string>;
  skills?: string[];
  experience?: string;
  projects?: Array<{ name: string; description: string }>;
  expectedSalary?: string;
  jobPreferences?: { roles?: string[] };
}

interface Field { index: number; label: string; type: string; options: string[]; }
interface Answer { index: number; value: string; }

const PROFILE_FILE = getProfilePath();
const AUDIT_FILE = PROFILE_FILE.replace(/profile\.json$/i, 'application-audit.jsonl');
const SENSITIVE = /gender|race|ethnicity|religion|disability|veteran|citizen|citizenship|visa|work authorization|criminal|background check/i;
const REQUIRED_CONTROLS = 'input[required], textarea[required], select[required], [aria-required="true"]:is(input, textarea, select), input[name*="customQuestionAnswers"], textarea[name*="customQuestionAnswers"], select[name*="customQuestionAnswers"]';

function getMode(): AgentMode {
  const mode = process.env.APPLICATION_AGENT_MODE?.trim().toLowerCase();
  return mode === 'fill' || mode === 'auto-submit' ? mode : 'review';
}

function profile(): Profile | null {
  try { return JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8').replace(/^\uFEFF/, '')) as Profile; } catch { return null; }
}

function audit(entry: unknown): void {
  fs.mkdirSync(path.dirname(AUDIT_FILE), { recursive: true });
  fs.appendFileSync(AUDIT_FILE, `${JSON.stringify({ at: new Date().toISOString(), ...entry as object })}\n`);
}

async function visibleRequiredFields(scope: Locator): Promise<Field[]> {
  const controls = scope.locator(REQUIRED_CONTROLS);
  const count = await controls.count();
  const fields: Field[] = [];
  for (let index = 0; index < count; index++) {
    const control = controls.nth(index);
    const data = await control.evaluate((element) => {
      const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const style = window.getComputedStyle(input);
      const id = input.id;
      const explicitLabel = (id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent : '')
        || input.getAttribute('aria-label')
        || (input.getAttribute('aria-labelledby')?.split(/\s+/).map((labelId) => document.getElementById(labelId)?.textContent ?? '').join(' '))
        || input.getAttribute('placeholder');
      let nearbyQuestion = '';
      let parent = input.parentElement;
      for (let depth = 0; parent && depth < 5; depth++, parent = parent.parentElement) {
        const text = (parent.innerText ?? '').replace(input.value ?? '', '').replace(/\s+/g, ' ').trim();
        if (text.length <= 350 && /\b(why|what|interest|excite|company|organization|role|team|work|join)\b/i.test(text)) {
          nearbyQuestion = text;
          break;
        }
      }
      const label = explicitLabel || nearbyQuestion || input.name || 'Required field';
      return {
        label: label.replace(/\s+/g, ' ').trim(), type: input instanceof HTMLInputElement ? input.type : input.tagName.toLowerCase(),
        options: input instanceof HTMLSelectElement ? Array.from(input.options).map((option) => option.text.trim()).filter(Boolean) : [],
        visible: style.display !== 'none' && style.visibility !== 'hidden', value: input.value.trim(),
      };
    }).catch(() => null);
    if (data?.visible && !data.value && data.type !== 'hidden' && data.type !== 'file') fields.push({ index, ...data });
  }
  return fields;
}

async function draftAnswers(fields: Field[], profileData: Profile, context: Record<string, string>): Promise<Answer[] | null> {
  const company = context.company?.trim();
  const role = context.role?.trim();
  const answers: Answer[] = [];
  const remaining = fields.filter((field) => {
    if (/\b(why|what|interest|excite|attract).{0,80}(company|organization|team|work|join|role)|(company|organization|team).{0,80}(interest|excite|attract)/i.test(field.label)) {
      const targetRole = role && role !== 'Unknown Role' ? role : (profileData.jobPreferences?.roles?.[0] ?? 'this role');
      const targetCompany = company && company !== 'Unknown Company' ? company : 'your company';
      answers.push({
        index: field.index,
        value: `I’m interested in ${targetCompany} because the ${targetRole} opportunity aligns with my career focus. I’d be excited to contribute, learn from the team, and grow with the company.`,
      });
      return false;
    }
    return true;
  });
  if (remaining.length === 0) return answers;
  const key = process.env.GROQ_API_KEY;
  if (!key) return answers.length ? answers : null;
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', temperature: 0.2, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return JSON only: {"answers":[{"index":number,"value":string}]}. Answer only from the supplied profile. Never invent facts, qualifications, employers, dates, salary, legal status, or protected characteristics. For salary questions, answer only if the profile has an explicit expectedSalary value; otherwise omit that answer. Keep each answer concise.' },
        { role: 'user', content: JSON.stringify({ profile: profileData, job: context, fields: remaining }) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Groq request failed (${response.status})`);
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = body.choices?.[0]?.message?.content;
  if (!content) return null;
  const parsed = JSON.parse(content) as { answers?: Answer[] };
  if (!Array.isArray(parsed.answers)) return answers.length ? answers : null;
  return [...answers, ...parsed.answers.filter((answer) => Number.isInteger(answer.index) && typeof answer.value === 'string' && answer.value.trim())];
}

export async function handleRequiredFields(scope: Locator, context: Record<string, string>): Promise<AgentResult> {
  const fields = await visibleRequiredFields(scope);
  if (fields.length === 0) return 'filled';
  if (fields.some((field) => SENSITIVE.test(field.label))) {
    log.skip('Sensitive or legal question requires your review');
    audit({ result: 'blocked_sensitive', context, fields });
    return 'blocked';
  }
  const profileData = profile();
  if (!profileData) {
    log.skip(`Required fields found. Create ${PROFILE_FILE} from profile.example.json first.`);
    audit({ result: 'blocked_missing_profile', context, fields });
    return 'blocked';
  }
  let answers: Answer[] | null;
  try { answers = await draftAnswers(fields, profileData, context); } catch (err) {
    log.error((err as Error).message); return 'blocked';
  }
  if (!answers || answers.length !== fields.length || answers.some((answer) => !fields.some((field) => field.index === answer.index))) {
    log.skip('Agent could not safely answer every required field');
    audit({ result: 'blocked_incomplete_answers', context, fields, answers });
    return 'blocked';
  }
  const mode = getMode();
  audit({ result: mode === 'review' ? 'review_required' : 'filled', mode, context, fields, answers });
  if (mode === 'review') {
    log.info(`Agent drafted ${answers.length} answer(s); review mode leaves the form unchanged.`);
    return 'review_required';
  }
  const controls = scope.locator(REQUIRED_CONTROLS);
  for (const answer of answers) {
    const control = controls.nth(answer.index);
    const tag = await control.evaluate((element) => element.tagName.toLowerCase());
    if (tag === 'select') await control.selectOption({ label: answer.value }).catch(() => control.selectOption(answer.value));
    else await control.fill(answer.value);
  }
  log.info(`Agent filled ${answers.length} required field(s).`);
  if (mode === 'fill') await log.waitForEnter('Review the agent-filled answers, then press Enter to submit');
  return 'filled';
}
