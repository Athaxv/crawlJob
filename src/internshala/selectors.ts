/** Internshala selectors shared by internship and job detail pages. */
export const IS = {
  listingLinks: [
    'a[href*="/internship/detail/"]',
    'a[href*="/job/detail/"]',
    'a[href*="/internships/detail/"]',
    'a[href*="/jobs/detail/"]',
  ].join(', '),
  applyButton: [
    'button:has-text("Apply now")',
    'a:has-text("Apply now")',
    'button:has-text("Apply Now")',
    'a:has-text("Apply Now")',
  ].join(', '),
  submitButton: [
    'button:has-text("Submit application")',
    'button:has-text("Submit Application")',
    'button:has-text("Submit")',
    'input[type="submit"]',
  ].join(', '),
  success: [
    ':text-is("Application submitted")',
    ':text-is("Application Submitted")',
    ':text-is("Applied")',
    ':has-text("application has been submitted")',
    ':has-text("Application submitted successfully")',
  ].join(', '),
  resumeHeading: 'h1:has-text("Your Internshala resume")',
  resumeContinue: [
    'button:has-text("Save and continue")',
    'button:has-text("Save & continue")',
    'button:has-text("Continue")',
    'button:has-text("Proceed")',
    'button:has-text("Next")',
  ].join(', '),
  captcha: [
    'iframe[src*="recaptcha"]',
    'iframe[src*="hcaptcha"]',
    '.g-recaptcha',
    '[data-sitekey]',
    'iframe[src*="challenges.cloudflare.com"]',
  ].join(', '),
} as const;

export const INTERNSHALA_DOMAIN_RE = /(^|\.)internshala\.com$/i;
export const INTERNSHALA_INTERNSHIPS_URL = process.env.INTERNSHALA_INTERNSHIPS_URL?.trim()
  || 'https://internshala.com/internships/';
export const INTERNSHALA_JOBS_URL = process.env.INTERNSHALA_JOBS_URL?.trim()
  || 'https://internshala.com/jobs/';
