<template>
  <div class="empty-state">
    <div class="empty-state-icon">
      <slot name="icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </slot>
    </div>
    
    <h3 v-if="title" class="empty-state-title">{{ title }}</h3>
    <p v-if="description" class="empty-state-description">{{ description }}</p>
    
    <div v-if="$slots.action || actionText" class="empty-state-actions">
      <slot name="action">
        <button v-if="actionText" @click="$emit('action')" class="empty-state-button">
          {{ actionText }}
        </button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface Props {
  title?: string
  description?: string
  actionText?: string
}

defineProps<Props>()

defineEmits<{
  action: []
}>()
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  color: var(--muted-foreground);
}

.empty-state-icon {
  margin-bottom: 1rem;
  opacity: 0.4;
}

.empty-state-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--foreground);
}

.empty-state-description {
  font-size: 0.875rem;
  margin: 0 0 1.5rem 0;
  max-width: 32rem;
  line-height: 1.5;
}

.empty-state-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.empty-state-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: var(--primary);
  color: var(--primary-foreground);
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.empty-state-button:hover {
  opacity: 0.9;
}

.empty-state-button:active {
  opacity: 0.8;
}
</style>
