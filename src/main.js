import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import App from './App.vue';

// Create the Vue app
const app = createApp(App);

// Setup Pinia with persistence
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);

// Mount the app
app.mount('#app');

// PWA Install Prompt handling
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Dispatch a custom event that Vue components can listen to
  window.dispatchEvent(new CustomEvent('pwa-install-available'));
});

// Export install function for components
window.installPWA = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome;
  }
  return null;
};

// Handle global errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
