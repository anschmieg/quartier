# Contributing to Quartier

Thank you for your interest in contributing to Quartier! This guide will help you get started.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Development](#development)
- [Code Quality](#code-quality)
- [Testing](#testing)
- [Deployment](#deployment)
- [Pull Request Process](#pull-request-process)

## Prerequisites

- **Node.js**: v18+
- **Bun**: v1.0+ (recommended) or npm
- **Wrangler**: Cloudflare CLI (`npm i -g wrangler`)
- **Git**: For version control

## Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/quartier.git
   cd quartier
   ```

2. **Install dependencies**:
   ```bash
   bun install
   # or
   npm install
   ```

3. **Configure Environment**:
   Copy the example environment file:
   ```bash
   cp .dev.vars.example .dev.vars
   ```
   
   Edit `.dev.vars` with your values:
   ```env
   GITHUB_CLIENT_ID=your_id
   GITHUB_CLIENT_SECRET=your_secret
   # Optional: Simulate generic user
   DEV_USER_EMAIL=local@quartier.dev
   # Optional: GitHub personal access token for API testing
   # DEV_GITHUB_TOKEN=ghp_your_token
   ```

4. **Configure Wrangler** (optional):
   ```bash
   cp wrangler.toml.example wrangler.toml
   ```
   Update with your KV namespace IDs if testing with real KV storage.

5. **Verify setup**:
   ```bash
   npm test
   ```

## Development

### Running Locally

**Option 1: Run everything together** (recommended):
```bash
npm run dev
```
This starts both the Vite dev server and Wrangler pages dev server.

**Option 2: Run separately**:
```bash
# Terminal 1 - Frontend
npm run dev:frontend

# Terminal 2 - API
npm run dev:api
```

The app will be available at:
- Frontend: `http://localhost:5173`
- API: `http://localhost:8788/api`

### Testing Auth Flows

**Host Mode** (GitHub OAuth):
1. Create a GitHub OAuth App at https://github.com/settings/developers
2. Set callback URL to `http://localhost:8788/api/oauth/callback`
3. Add credentials to `.dev.vars`
4. Test login flow

**Guest Mode** (Cloudflare Access):
1. Set `DEV_USER_EMAIL` in `.dev.vars` to simulate authenticated user
2. Or add `X-Dev-User` header to API requests
3. Test share link flow

### Project Structure

```
quartier/
├── src/                    # Frontend source code
│   ├── components/        # Vue components
│   ├── services/          # Service layer (API, storage, collab)
│   ├── composables/       # Vue composables
│   └── types/             # TypeScript type definitions
├── functions/             # Cloudflare Pages Functions (API)
│   ├── api/              # API endpoints
│   ├── types/            # Shared types
│   └── utils/            # Utility functions
├── docs/                  # Documentation
├── test/                  # Test configuration
└── public/               # Static assets
```

## Code Quality

### Linting

Run ESLint to check for code issues:
```bash
npm run lint
```

Fix auto-fixable issues:
```bash
npm run lint:fix
```

### Formatting

Check formatting with Prettier:
```bash
npm run format:check
```

Format all files:
```bash
npm run format
```

### Pre-commit Checklist

Before committing, ensure:
- [ ] Code passes linting (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Changes are documented in CHANGELOG.md

## Testing

### Running Tests

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test -- --watch
```

Run specific test file:
```bash
npm test -- src/tests/storage.test.ts
```

### Writing Tests

We use Vitest for testing. Example:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { myFunction } from '@/services/myService'

describe('myFunction', () => {
  beforeEach(() => {
    // Setup
  })

  it('should do something', () => {
    const result = myFunction()
    expect(result).toBe(expected)
  })
})
```

## Deployment

### Automatic Deployment

Quartier uses Cloudflare Pages for automatic deployments:

- **Production**: Deploys on push to `main` branch
- **Preview**: Deploys on pull requests

### Manual Deployment

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy to Cloudflare Pages**:
   ```bash
   wrangler pages deploy dist
   ```

3. **Set environment variables**:
   ```bash
   wrangler pages secret put GITHUB_CLIENT_ID
   wrangler pages secret put GITHUB_CLIENT_SECRET
   ```

### Environment-Specific Configuration

- **Development**: Uses `.dev.vars`
- **Production**: Uses Cloudflare Pages environment variables

See [ENVIRONMENT.md](./ENVIRONMENT.md) for full configuration details.

## Pull Request Process

### Before Submitting

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** with clear, atomic commits

3. **Update documentation**:
   - Update relevant .md files in `docs/`
   - Add entry to `CHANGELOG.md` under `[Unreleased]`
   - Update inline code comments

4. **Test your changes**:
   ```bash
   npm run lint
   npm run format:check
   npm test
   npm run build
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/my-feature
   ```

### Submitting PR

1. **Open a pull request** on GitHub

2. **Fill out the PR template** with:
   - Description of changes
   - Related issue numbers
   - Screenshots (for UI changes)
   - Testing steps

3. **Wait for review**:
   - Address review comments
   - Keep PR up to date with `main`
   - Ensure CI checks pass

### PR Guidelines

- **Keep it focused**: One feature/fix per PR
- **Write clear commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/)
- **Add tests**: For new features and bug fixes
- **Update docs**: Keep documentation in sync
- **Be responsive**: Address feedback promptly

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define types for function parameters and return values
- Avoid `any` type (use `unknown` if necessary)
- Use interfaces for objects with methods, types for data structures

### Vue

- Use Composition API with `<script setup>`
- Define prop types explicitly
- Emit events with proper typing
- Use meaningful component names

### Naming Conventions

- **Components**: PascalCase (e.g., `FileBrowser.vue`)
- **Composables**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Services**: camelCase (e.g., `githubService.ts`)
- **Types**: PascalCase (e.g., `SessionType`)
- **Constants**: UPPER_SNAKE_CASE

### File Organization

- Group related files together
- Use index.ts for exports
- Keep files focused and small (<300 lines)

## Documentation

### Inline Documentation

Use JSDoc comments for functions:

```typescript
/**
 * Validates a session ID format
 * @param id - The session ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidSessionId(id: string): boolean {
  return /^session_[a-f0-9]{12}$/.test(id)
}
```

### Documentation Files

Update relevant documentation:
- `README.md`: High-level overview
- `docs/API.md`: API endpoint changes
- `docs/USER_GUIDE.md`: User-facing features
- `docs/ARCHITECTURE.md`: System design changes
- `docs/SECURITY.md`: Security implications
- `CHANGELOG.md`: All changes

## Getting Help

- **Questions**: Open a discussion on GitHub
- **Bugs**: Open an issue with reproduction steps
- **Features**: Open an issue with use case description
- **Security**: Follow SECURITY.md reporting process

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
