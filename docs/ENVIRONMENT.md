# Environment Variables

This document describes all environment variables used by Quartier.

## Required Variables (Production)

### GitHub OAuth

**GITHUB_CLIENT_ID**
- Description: GitHub OAuth App Client ID
- Required: Yes (for Host mode authentication)
- Where to get: Create a GitHub OAuth App at https://github.com/settings/developers
- Example: `Iv1.1234567890abcdef`

**GITHUB_CLIENT_SECRET**
- Description: GitHub OAuth App Client Secret
- Required: Yes (for Host mode authentication)
- Security: Keep this secret! Never commit to git
- Example: `abcdef1234567890abcdef1234567890abcdef12`

**GitHub OAuth App Configuration**:
- Homepage URL: `https://your-domain.com`
- Authorization callback URL: `https://your-domain.com/api/oauth/callback`

---

## Optional Variables

### Development Overrides

**DEV_USER_EMAIL**
- Description: Simulates Cloudflare Access authentication in local development
- Required: No (development only)
- Default: None
- Example: `developer@example.com`
- Use case: Testing Guest mode locally without Cloudflare Access

**DEV_ACCESS_TOKEN**
- Description: GitHub Personal Access Token for local API testing
- Required: No (development only)
- Default: None
- Example: `ghp_abcdefghijklmnopqrstuvwxyz123456`
- Permissions needed:
  - `repo` - Full control of private repositories
  - `read:user` - Read user profile data
- Where to get: https://github.com/settings/tokens

---

## Cloudflare Configuration

These are configured in the Cloudflare dashboard, not as environment variables.

### KV Namespaces

**QUARTIER_KV**
- Description: Cloudflare KV namespace for sessions and file caching
- Type: KV Namespace binding
- Required: Yes
- Setup:
  1. Create KV namespace: `wrangler kv:namespace create QUARTIER_KV`
  2. Bind in `wrangler.toml`:
     ```toml
     [[kv_namespaces]]
     binding = "QUARTIER_KV"
     id = "your-kv-namespace-id"
     ```

### Cloudflare Access

Configured in Cloudflare Dashboard → Zero Trust → Access:

1. **Application**: Protect your domain or specific paths
2. **Identity Providers**: Configure Google, Email OTP, etc.
3. **Access Policies**: Define who can access the application

---

## Configuration Files

### .dev.vars (Local Development)

Create this file in the project root for local development. **Do not commit to git!**

```env
# GitHub OAuth (required for Host mode)
GITHUB_CLIENT_ID=Iv1.your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here

# Development overrides (optional)
DEV_USER_EMAIL=local@quartier.dev
DEV_ACCESS_TOKEN=ghp_your_github_personal_access_token
```

### wrangler.toml (Cloudflare Pages)

Configure Cloudflare-specific settings:

```toml
name = "quartier"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "QUARTIER_KV"
id = "your-kv-namespace-id"

[env.production]
[[env.production.kv_namespaces]]
binding = "QUARTIER_KV"
id = "your-production-kv-namespace-id"
```

---

## Setting Environment Variables

### Local Development

1. Copy the example file:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Edit `.dev.vars` with your values

3. Wrangler automatically loads `.dev.vars` when running:
   ```bash
   npm run dev
   ```

### Cloudflare Pages (Production)

Set environment variables in the Cloudflare dashboard:

1. Go to **Pages** → **Your Project** → **Settings** → **Environment Variables**
2. Add variables:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
3. Deploy or redeploy your application

Or use Wrangler CLI:
```bash
wrangler pages secret put GITHUB_CLIENT_ID
wrangler pages secret put GITHUB_CLIENT_SECRET
```

---

## Security Best Practices

### Do Not Commit Secrets

Add to `.gitignore`:
```gitignore
.dev.vars
.env
.env.local
*.secret
```

### Rotate Secrets Regularly

- Rotate GitHub OAuth secrets every 90 days
- Rotate personal access tokens every 30 days (for dev)
- Use different credentials for dev and production

### Principle of Least Privilege

- Only grant necessary GitHub permissions
- Use different OAuth Apps for dev and production
- Limit Cloudflare Access to specific paths when possible

### Monitor Usage

- Review GitHub OAuth App usage regularly
- Monitor Cloudflare Access logs
- Set up alerts for unusual activity

---

## Troubleshooting

### "Unauthorized" errors in development

**Problem**: API returns 401 Unauthorized

**Solutions**:
1. Check that `DEV_ACCESS_TOKEN` is set in `.dev.vars`
2. Verify token has correct permissions
3. Check that token hasn't expired
4. Ensure `.dev.vars` is in the project root

### GitHub OAuth not working

**Problem**: Login redirects fail or error

**Solutions**:
1. Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set
2. Check GitHub OAuth App callback URL matches your domain
3. Ensure OAuth App is not suspended
4. Check browser console for CORS errors

### Cloudflare Access issues in production

**Problem**: Users can't authenticate

**Solutions**:
1. Verify Cloudflare Access is configured for your domain
2. Check identity provider settings
3. Verify access policies include your users
4. Check that pages are not publicly accessible

### KV namespace errors

**Problem**: "KV namespace not found" errors

**Solutions**:
1. Create KV namespace: `wrangler kv:namespace create QUARTIER_KV`
2. Update `wrangler.toml` with correct namespace ID
3. Redeploy application
4. Check KV bindings in Cloudflare dashboard

---

## Environment-Specific Behavior

### Development
- Uses `.dev.vars` for configuration
- `DEV_USER_EMAIL` simulates Cloudflare Access
- `DEV_ACCESS_TOKEN` provides GitHub API access
- IndexedDB and localStorage work normally

### Production
- Uses Cloudflare Pages environment variables
- Cloudflare Access provides authentication
- GitHub OAuth provides Host mode authentication
- KV namespace provides persistent storage

### Testing
- Uses test-specific configuration
- Mock services for external APIs
- Isolated storage (jsdom environment)
- No real GitHub or Cloudflare services

---

## Migration Notes

If upgrading from an older version:

### Version 0.9.x → 1.0.x
- Add `QUARTIER_KV` namespace binding
- Update GitHub OAuth callback URL format
- Review Cloudflare Access policies

---

## Related Documentation

- [Contributing Guide](./CONTRIBUTING.md) - Development setup
- [Architecture](./ARCHITECTURE.md) - System design
- [API Documentation](./API.md) - API endpoint reference
