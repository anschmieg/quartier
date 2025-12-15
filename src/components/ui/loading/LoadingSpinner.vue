<template>
  <div class="loading-spinner" :class="sizeClass">
    <svg
      class="spinner"
      :width="size"
      :height="size"
      viewBox="0 0 50 50"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        class="spinner-path"
        cx="25"
        cy="25"
        r="20"
        fill="none"
        :stroke-width="strokeWidth"
      />
    </svg>
    <span v-if="message" class="loading-message" role="status" aria-live="polite">{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
})

const sizeClass = computed(() => `loading-spinner-${props.size}`)

const size = computed(() => {
  switch (props.size) {
    case 'sm':
      return 24
    case 'lg':
      return 64
    default:
      return 40
  }
})

const strokeWidth = computed(() => {
  switch (props.size) {
    case 'sm':
      return 4
    case 'lg':
      return 3
    default:
      return 4
  }
})
</script>

<style scoped>
.loading-spinner {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.spinner {
  animation: rotate 2s linear infinite;
}

.spinner-path {
  stroke: currentColor;
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

.loading-message {
  font-size: 0.875rem;
  color: var(--muted-foreground);
}

.loading-spinner-sm {
  font-size: 0.75rem;
}

.loading-spinner-lg {
  font-size: 1rem;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}
</style>
