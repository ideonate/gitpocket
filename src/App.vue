<template>
  <div class="app-container">
    <!-- Install Prompt -->
    <div v-if="showInstall" class="install-prompt">
      <div>📱 Install GitPocket</div>
      <div class="install-subtitle">
        Add to your home screen for the full app experience
      </div>
      <button class="install-btn" @click="installApp">Install App</button>
      <button class="install-btn-later" @click="showInstall = false">Later</button>
    </div>

    <!-- Auth Screen -->
    <AuthScreen
      v-if="!authStore.authenticated"
      @authenticated="onAuthenticated"
    />

    <!-- Main App -->
    <template v-else>
      <AppBar
        @refresh="refreshData"
        @show-profile="showProfile = true"
      />

      <TabBar />

      <div class="content">
        <IssuesList v-show="appStore.currentTab === 0" />
        <PRsList v-show="appStore.currentTab === 1" />
        <ActionsList v-show="appStore.currentTab === 2" />
      </div>

      <!-- Detail View -->
      <DetailView />

      <!-- Profile Modal -->
      <ProfileModal
        v-if="showProfile"
        @close="showProfile = false"
      />
    </template>

    <!-- Message Toast -->
    <MessageToast />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from './stores/auth';
import { useAppStore } from './stores/app';
import { useGitHub } from './composables/useGitHub';

import AuthScreen from './components/auth/AuthScreen.vue';
import AppBar from './components/layout/AppBar.vue';
import TabBar from './components/layout/TabBar.vue';
import ProfileModal from './components/layout/ProfileModal.vue';
import MessageToast from './components/layout/MessageToast.vue';
import IssuesList from './components/issues/IssuesList.vue';
import PRsList from './components/prs/PRsList.vue';
import ActionsList from './components/actions/ActionsList.vue';
import DetailView from './components/shared/DetailView.vue';

const authStore = useAuthStore();
const appStore = useAppStore();
const { loadData, refreshData: refresh } = useGitHub();

const showProfile = ref(false);
const showInstall = ref(false);

onMounted(() => {
  // Check for existing authentication
  authStore.checkExistingAuth();

  // If authenticated, load data
  if (authStore.authenticated) {
    loadData(appStore.currentFilter);
  }

  // Listen for PWA install event
  window.addEventListener('pwa-install-available', () => {
    showInstall.value = true;
  });
});

async function onAuthenticated() {
  await loadData();
}

async function refreshData() {
  await refresh();
}

async function installApp() {
  if (window.installPWA) {
    await window.installPWA();
  }
  showInstall.value = false;
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
  overflow-x: hidden;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* Allow text selection on content areas for copy/paste */
.detail-body,
.comment-body,
.detail-title-text,
.workflow-info {
  user-select: text;
  -webkit-user-select: text;
  -webkit-touch-callout: default;
}

#app {
  width: 100%;
  height: 100%;
}

.app-container {
  max-width: 100vw;
  height: 100vh;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  min-height: 0;
}

/* Install Prompt */
.install-prompt {
  background: linear-gradient(135deg, #6750a4, #7c4dff);
  color: white;
  padding: 16px;
  margin: 16px;
  border-radius: 12px;
  text-align: center;
}

.install-subtitle {
  font-size: 14px;
  margin-top: 8px;
  opacity: 0.9;
}

.install-btn {
  background: white;
  color: #6750a4;
  border: none;
  padding: 12px 24px;
  border-radius: 20px;
  font-weight: 500;
  margin-top: 12px;
  cursor: pointer;
}

.install-btn-later {
  background: transparent;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 20px;
  font-weight: 500;
  margin-top: 12px;
  margin-left: 8px;
  cursor: pointer;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  body {
    background: #121212;
    color: #e0e0e0;
  }

  .app-container {
    background: #1e1e1e;
  }
}
</style>
