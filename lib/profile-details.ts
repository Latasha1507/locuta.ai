// Profile details live in the profiles.onboarding_data JSONB blob — the same
// place the onboarding form writes to. Storing DOB and the rest here means no
// migration, and Edit Profile and onboarding stay in sync on one shape.

export interface ProfileDetails {
  dateOfBirth?: string // ISO yyyy-mm-dd
  ageRange?: string
  gender?: string
  primaryGoal?: string
  currentProficiency?: string
  useCase?: string
  nativeLanguage?: string
  country?: string
}

// Onboarding historically wrote snake_case keys; Edit Profile writes camelCase.
// Read both so nothing is lost for existing users.
export function readProfileDetails(raw: unknown): ProfileDetails {
  if (!raw || typeof raw !== 'object') return {}
  const p = raw as Record<string, unknown>
  const s = (camel: string, snake: string) =>
    (typeof p[camel] === 'string' ? p[camel] : typeof p[snake] === 'string' ? p[snake] : undefined) as
      | string
      | undefined
  return {
    dateOfBirth: s('dateOfBirth', 'date_of_birth'),
    ageRange: s('ageRange', 'age_range'),
    gender: s('gender', 'gender'),
    primaryGoal: s('primaryGoal', 'primary_goal'),
    currentProficiency: s('currentProficiency', 'current_proficiency'),
    useCase: s('useCase', 'use_case'),
    nativeLanguage: s('nativeLanguage', 'native_language'),
    country: s('country', 'country'),
  }
}

export const GOALS = ['Build confidence', 'Job interviews', 'Public speaking', 'Everyday conversation', 'Accent & clarity']
export const PROFICIENCY = ['Beginner', 'Intermediate', 'Advanced', 'Fluent']

/** Derive an age from DOB, or null. Used for a friendly display, not gating. */
export function ageFromDob(dob?: string): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age >= 0 && age < 130 ? age : null
}

export function sanitizeProfileDetails(body: Record<string, unknown>): Partial<ProfileDetails> {
  const out: Partial<ProfileDetails> = {}
  const str = (k: keyof ProfileDetails, max = 60) => {
    if (typeof body[k] === 'string') out[k] = (body[k] as string).slice(0, max)
  }
  if (typeof body.dateOfBirth === 'string') {
    // Accept only a plausible ISO date.
    const d = new Date(body.dateOfBirth)
    if (!isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth)) out.dateOfBirth = body.dateOfBirth
  }
  str('primaryGoal')
  str('currentProficiency')
  str('gender', 30)
  str('nativeLanguage', 40)
  str('country', 40)
  return out
}
