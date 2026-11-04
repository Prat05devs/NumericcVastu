// Shared by the report form (browser) and the order route (server).
/** A second person's date of birth must be at least this many years ago: phones fill in today's date on a stray tap. */
export const PARTNER_MIN_AGE = 15;
export function partnerDobProblem(iso, today = new Date()) {
  if (!iso) return '';
  const limit = new Date(today.getFullYear() - PARTNER_MIN_AGE, today.getMonth(), today.getDate());
  return new Date(`${iso}T00:00:00`) > limit ? `Check the second person’s date of birth: it must be at least ${PARTNER_MIN_AGE} years ago. Clear it if you do not want a two-person comparison.` : '';
}
