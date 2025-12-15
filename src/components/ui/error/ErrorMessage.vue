<template>
  <div class="error-message" :class="variantClass">
    <div class="error-icon">
      <svg
        v-if="variant === 'error'"
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <svg
        v-else-if="variant === 'warning'"
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </div>
    
    <div class="error-content">
      <h4 v-if="title" class="error-title">{{ title }}</h4>
      <p class="error-description">{{ message }}</p>
      <p v-if="details" class="error-details">{{ details }}</p>
      
      <div v-if="actionText" class="error-actions">
        <button @click="$emit('action')" class="error-action-button">
          {{ actionText }}
        </button>
        <button v-if="dismissible" @click="$emit('dismiss')" class="error-dismiss-button">
          Dismiss
        </button>
      </div>
    </div>
    
    <button v-if="dismissible && !actionText" @click="$emit('dismiss')" class="error-close">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  variant?: 'error' | 'warning' | 'info'
  title?: string
  message: string
  details?: string
  actionText?: string
  dismissible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'error',
  dismissible: false,
})

defineEmits<{
  action: []
  dismiss: []
}>()

const variantClass = computed(() => `error-message-${props.variant}`)
</script>

<style scoped>
.error-message {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid;
  background-color: var(--background);
}

.error-message-error {
  border-color: #ef4444;
  background-color: #fef2f2;
  color: #991b1b;
}

.error-message-warning {
  border-color: #f59e0b;
  background-color: #fffbeb;
  color: #92400e;
}

.error-message-info {
  border-color: #3b82f6;
  background-color: #eff6ff;
  color: #1e40af;
}

.error-icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-title {
  font-weight: 600;
  font-size: 0.875rem;
  margin: 0 0 0.25rem 0;
}

.error-description {
  font-size: 0.875rem;
  margin: 0;
}

.error-details {
  font-size: 0.75rem;
  margin: 0.5rem 0 0 0;
  opacity: 0.8;
  font-family: monospace;
}

.error-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.error-action-button,
.error-dismiss-button {
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.2s;
}

.error-action-button {
  background-color: currentColor;
  color: white;
  border-color: currentColor;
}

.error-action-button:hover {
  opacity: 0.9;
}

.error-dismiss-button {
  background-color: transparent;
  color: currentColor;
  border-color: currentColor;
}

.error-dismiss-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.error-close {
  flex-shrink: 0;
  padding: 0.25rem;
  background: none;
  border: none;
  cursor: pointer;
  color: currentColor;
  opacity: 0.6;
  transition: opacity 0.2s;
  align-self: flex-start;
}

.error-close:hover {
  opacity: 1;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .error-message-error {
    background-color: #7f1d1d;
    color: #fecaca;
  }
  
  .error-message-warning {
    background-color: #78350f;
    color: #fde68a;
  }
  
  .error-message-info {
    background-color: #1e3a8a;
    color: #bfdbfe;
  }
}
</style>
