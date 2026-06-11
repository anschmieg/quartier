<template>
  <main class="landing-page">
    <section class="hero" aria-labelledby="landing-title">
      <div class="hero-content">
        <h1 id="landing-title" class="title">Quartier</h1>
        <p class="tagline">A home for your research.</p>
        <p class="description">
          {{ buildFeatures.remoteStorage
            ? 'Write, organize, and collaborate on research with a Quarto editor that connects to your projects.'
            : 'A local-first Quarto editor for focused writing, semantic blocks, autocomplete, preview, and portable .qmd files.' }}
        </p>
        
        <div class="auth-buttons">
          <button @click="login" class="login-button primary">
            Start Writing
            <svg class="icon arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <p v-if="buildFeatures.remoteStorage" class="privacy-note">
          We use Cloudflare Access for secure authentication. 
          Your data stays in your GitHub repositories.
        </p>
        <p v-else class="privacy-note">
          No account or cloud connection required. Your draft stays in this browser until you export it.
        </p>
      </div>
    </section>

    <section class="features" aria-label="Quartier features">
      <div class="feature">
        <div class="feature-icon">📝</div>
        <h2>Quarto-native writing</h2>
        <p>Write prose, frontmatter, code cells, callouts, citations, and cross-references in one calm surface.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">⌨️</div>
        <h2>Autocomplete-first</h2>
        <p>Discover Quarto syntax through contextual suggestions instead of memorizing every option.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">{{ buildFeatures.remoteStorage ? '☁️' : '💾' }}</div>
        <h2>{{ buildFeatures.remoteStorage ? 'Connected projects' : 'Local safety' }}</h2>
        <p>
          {{ buildFeatures.remoteStorage
            ? 'Open documents from supported storage providers while keeping the editor workflow consistent.'
            : 'Autosave locally, preview on demand, and export a portable .qmd whenever you want.' }}
        </p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { buildFeatures } from 'virtual:quartier-features'

const router = useRouter()

function login() {
  void router.push(buildFeatures.remoteStorage ? '/app' : '/writer')
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

.login-button.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
}

.login-button.primary:hover {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.login-button .icon {
  width: 1.25rem;
  height: 1.25rem;
}

.login-button .icon.arrow {
  transition: transform 0.2s ease;
}

.login-button:hover .icon.arrow {
  transform: translateX(4px);
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

.feature h2 {
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
