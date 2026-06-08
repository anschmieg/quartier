const GITHUB_OWNER_PATTERN = /^(?!-)[A-Za-z0-9-]{1,39}(?<!-)$/
const GITHUB_REPOSITORY_PATTERN = /^[A-Za-z0-9._-]{1,100}$/

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 || codePoint === 127
  })
}

export interface GitHubRepositoryInput {
  owner: string
  repository: string
  path: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

function decodeForValidation(value: string): string | null {
  let decoded = value

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const next = decodeURIComponent(decoded)
      if (next === decoded) {
        return decoded
      }
      decoded = next
    }
    return decoded
  } catch {
    return null
  }
}

export function isValidSameOriginReturnPath(value: string): boolean {
  const decoded = decodeForValidation(value)
  if (!decoded
    || decoded.length > 2048
    || !decoded.startsWith('/')
    || decoded.startsWith('//')
    || decoded.includes('\\')
    || hasControlCharacters(decoded)) {
    return false
  }

  try {
    const base = new URL('https://quartier.invalid')
    const resolved = new URL(decoded, base)
    return resolved.origin === base.origin
  } catch {
    return false
  }
}

export function isValidGitHubOwner(owner: string): boolean {
  return GITHUB_OWNER_PATTERN.test(owner)
}

export function isValidGitHubRepository(repository: string): boolean {
  return GITHUB_REPOSITORY_PATTERN.test(repository)
    && repository !== '.'
    && repository !== '..'
}

export function isValidGitHubDocumentPath(path: string): boolean {
  const decoded = decodeForValidation(path)
  if (!decoded
    || decoded.length > 1024
    || decoded.startsWith('/')
    || decoded.endsWith('/')
    || decoded.includes('\\')
    || hasControlCharacters(decoded)) {
    return false
  }

  const segments = decoded.split('/')
  return segments.every(segment => segment !== '' && segment !== '.' && segment !== '..')
    && decoded.toLowerCase().endsWith('.qmd')
}

export function validateGitHubRepositoryInput(
  input: GitHubRepositoryInput,
): ValidationResult {
  const errors: string[] = []

  if (!isValidGitHubOwner(input.owner)) {
    errors.push('Enter a valid GitHub owner.')
  }
  if (!isValidGitHubRepository(input.repository)) {
    errors.push('Enter a valid GitHub repository name.')
  }
  if (!isValidGitHubDocumentPath(input.path)) {
    errors.push('Enter a relative path to a .qmd file.')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
