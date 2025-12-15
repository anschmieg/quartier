<template>
  <div 
    v-if="showIndicator"
    class="connection-status"
    :class="statusClass"
    :title="statusText"
    role="status"
    :aria-label="`Connection status: ${statusText}`"
  >
    <div class="status-dot" :class="dotClass"></div>
    <span v-if="showText" class="status-text">{{ statusText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  showText?: boolean
  showAlways?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showText: true,
  showAlways: false,
})

const showIndicator = computed(() => {
  return props.showAlways || props.status !== 'connected'
})

const statusClass = computed(() => {
  return `status-${props.status}`
})

const dotClass = computed(() => {
  return `dot-${props.status}`
})

const statusText = computed(() => {
  switch (props.status) {
    case 'connecting':
      return 'Connecting...'
    case 'connected':
      return 'Connected'
    case 'disconnected':
      return 'Disconnected'
    case 'error':
      return 'Connection Error'
    default:
      return 'Unknown'
  }
})
</script>

<style scoped>
.connection-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: var(--background);
  border: 1px solid var(--border);
  transition: all 0.2s ease;
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.dot-connecting {
  background-color: #f59e0b;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.dot-connected {
  background-color: #10b981;
}

.dot-disconnected {
  background-color: #6b7280;
}

.dot-error {
  background-color: #ef4444;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.status-text {
  color: var(--foreground);
  font-weight: 500;
}

.status-connecting {
  border-color: #f59e0b;
}

.status-connected {
  border-color: #10b981;
}

.status-disconnected {
  border-color: #6b7280;
}

.status-error {
  border-color: #ef4444;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
