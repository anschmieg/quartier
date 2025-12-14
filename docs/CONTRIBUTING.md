# Contributing to Quartier

## Prerequisites

- **Node.js**: v18+
- **Bun**: v1.0+ (used as package manager and runtime)
- **Wrangler**: Cloudflare CLI (`npm i -g wrangler`)

## Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/anschmieg/quartier.git
   cd quartier
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Configure Environment**:
   Create a `.dev.vars` file in the root for Cloudflare Functions local dev:
   ```env
   GITHUB_CLIENT_ID=your_id
   GITHUB_CLIENT_SECRET=your_secret
   # Optional: Simulate generic user
   DEV_USER_EMAIL=local@quartier.dev
   ```

## Development

Run the frontend and backend proxy locally:

```bash
bun start:dev
```
This runs `wrangler pages dev` which serves the Vite frontend and the Functions.

## Testing Auth Flows

- **Host Mode**: Requires valid GitHub OAuth apps. Set `GITHUB_CLIENT_ID` in `.dev.vars`.
- **Guest Mode**: To simulate Cloudflare Access locally, you can set the `X-Dev-User` header or use `DEV_USER_EMAIL`.

## Deploying

Deployments are handled by Cloudflare Pages CI/CD.
Manual deployment:
```bash
bun run build
wrangler pages deploy dist
```
