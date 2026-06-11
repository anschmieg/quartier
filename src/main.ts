import { createApp } from 'vue'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/newsreader/400.css'
import '@fontsource/newsreader/400-italic.css'
import '@fontsource/newsreader/700.css'
import './assets/css/tailwind.css'
import App from './App.vue'
import router from './router'
import { loadRemoteStorage } from 'virtual:quartier-features'

async function startApplication() {
  if (loadRemoteStorage) {
    const remoteStorage = await loadRemoteStorage()
    remoteStorage.registerRemoteStorage()
  }

  createApp(App).use(router).mount('#app')
}

void startApplication()
