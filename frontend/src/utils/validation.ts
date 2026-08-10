/**
 * Client-side mirrors of the backend's validation rules (auth.py). These exist
 * to give immediate feedback — the server re-validates everything and remains
 * the source of truth.
 */

export const USERNAME_PATTERN = /^[a-z0-9_.-]{3,32}$/
export const MIN_PASSWORD_LENGTH = 12
export const MAX_PASSWORD_LENGTH = 128

export function validateUsername(raw: string): string | null {
  const username = raw.trim().toLowerCase()

  if (!username) return 'Username is required'
  if (username.includes('@')) {
    return 'Use a username, not an email address — letters, digits, dots, dashes and underscores only'
  }
  if (username.length < 3) return 'Username must be at least 3 characters'
  if (username.length > 32) return 'Username must be at most 32 characters'
  if (!USERNAME_PATTERN.test(username)) {
    return 'Only lowercase letters, digits, and the characters . _ - are allowed'
  }
  return null
}

/** The backend requires at least 3 of the 4 character classes. */
export function passwordClassCount(password: string): number {
  return [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required'
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`
  }
  if (passwordClassCount(password) < 3) {
    return 'Use at least 3 of: uppercase, lowercase, digit, symbol'
  }
  return null
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3
  label: string
  /** Requirements list rendered under the field, each with a met/unmet state. */
  checks: { label: string; met: boolean }[]
}

export function passwordStrength(password: string): PasswordStrength {
  const longEnough = password.length >= MIN_PASSWORD_LENGTH
  const classes = passwordClassCount(password)

  const checks = [
    { label: `At least ${MIN_PASSWORD_LENGTH} characters`, met: longEnough },
    { label: '3 of: uppercase, lowercase, digit, symbol', met: classes >= 3 },
    { label: 'All 4 character types (recommended)', met: classes === 4 },
  ]

  const met = checks.filter((check) => check.met).length
  const score = (password ? met : 0) as 0 | 1 | 2 | 3
  const label = ['Too weak', 'Weak', 'Good', 'Strong'][score]

  return { score, label, checks }
}
