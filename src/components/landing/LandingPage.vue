<template>
  <div class="landing-page">
    <div class="hero">
      <div class="hero-content">
        <h1 class="title">Quartier</h1>
        <p class="tagline">A home for your research.</p>
        <p class="description">
          Write, organize, and collaborate on your research with a beautiful 
          Markdown editor that syncs with GitHub.
        </p>
        
        <div class="auth-buttons">
          <button @click="login" class="login-button github">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Sign in with GitHub
          </button>
        </div>

        <p class="privacy-note">
          We use Cloudflare Access for secure authentication. 
          Your data stays in your GitHub repositories.
        </p>
      </div>
    </div>

    <div class="features">
      <div class="feature">
        <div class="feature-icon">📝</div>
        <h3>Rich Markdown Editor</h3>
        <p>Write with a beautiful visual editor that supports GFM, math equations, and diagrams.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🔄</div>
        <h3>GitHub Sync</h3>
        <p>Your files live in GitHub. Edit directly from your browser, commit when ready.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">☁️</div>
        <h3>Cloud Storage</h3>
        <p>Edits are saved instantly. Never lose your work, even without committing.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
function login() {
  // Cloudflare Access handles the redirect automatically
  // Just redirect to the main app - Access will intercept if not authenticated
  window.location.href = '/cdn-cgi/access/login'
}
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: #fff;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  padding: 4rem 2rem;
  text-align: center;
}

.hero-content {
  max-width: 600px;
}

.title {
  font-size: 4rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tagline {
  font-size: 1.5rem;
  color: #94a3b8;
  margin: 0 0 1.5rem;
  font-style: italic;
}

.description {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #cbd5e1;
  margin: 0 0 2.5rem;
}

.auth-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.login-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 2rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.login-button.github {
  background: #24292e;
  color: #fff;
}

.login-button.github:hover {
  background: #2d3339;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.login-button .icon {
  width: 1.25rem;
  height: 1.25rem;
}

.privacy-note {
  margin-top: 2rem;
  font-size: 0.875rem;
  color: #64748b;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  padding: 4rem 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.feature {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  transition: transform 0.2s ease, background 0.2s ease;
}

.feature:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.08);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.feature h3 {
  font-size: 1.25rem;
  margin: 0 0 0.75rem;
  color: #fff;
}

.feature p {
  font-size: 0.95rem;
  line-height: 1.5;
  color: #94a3b8;
  margin: 0;
}

@media (max-width: 640px) {
  .title {
    font-size: 2.5rem;
  }
  
  .tagline {
    font-size: 1.25rem;
  }
  
  .hero {
    min-height: 60vh;
    padding: 2rem 1.5rem;
  }
}
</style>
