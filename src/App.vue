<template>
  <Suspense>
    <template #default>
      <LandingPage v-if="!isAuthenticated" />
      <AppLayout v-else />
    </template>
    <template #fallback>
      <div class="loading-screen">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import LandingPage from '@/components/landing/LandingPage.vue'
import { getAuthUser } from '@/services/auth'

const isAuthenticated = ref(false)

onMounted(async () => {
  const user = await getAuthUser()
  isAuthenticated.value = !!user
})
</script>

<style>
.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #1a1a2e;
  color: #fff;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
