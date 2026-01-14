<template>
  <div class="profile-overlay" @click.self="$emit('close')">
    <div class="profile-dialog">
      <div class="profile-header">
        <h2>👤 Profile</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="profile-body">
        <div class="profile-info">
          <div class="profile-user">
            <strong>Signed in as:</strong> {{ authStore.user?.login || 'Unknown' }}
          </div>

          <div class="token-summary">
            <h3>Token Status</h3>
            <div class="token-stats">
              <div v-if="authStore.personalToken" class="token-stat">
                ✅ Personal token active
              </div>
              <div v-else class="token-stat warning">
                ⚠️ No personal token
              </div>
              <div class="token-stat">
                {{ orgTokenCount }} organization token{{ orgTokenCount !== 1 ? 's' : '' }}
              </div>
            </div>
          </div>
        </div>

        <div class="profile-actions">
          <button class="profile-btn primary" @click="openTokenManagement">
            🔐 Manage Tokens
          </button>

          <button class="profile-btn action" @click="reloadRepos">
            🔄 Reload Repositories
          </button>

          <button class="profile-btn secondary" @click="signOut">
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>

    <TokenManagement
      v-if="showTokenManagement"
      @close="showTokenManagement = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useGitHub } from '../../composables/useGitHub';
import TokenManagement from '../auth/TokenManagement.vue';

const emit = defineEmits(['close']);

const authStore = useAuthStore();
const { reloadRepositories } = useGitHub();
const showTokenManagement = ref(false);

const orgTokenCount = computed(() =>
  authStore.allTokens.filter(t => t.type === 'organization').length
);

function openTokenManagement() {
  showTokenManagement.value = true;
}

async function reloadRepos() {
  await reloadRepositories();
  emit('close');
}

function signOut() {
  if (confirm('Sign out from GitPocket?')) {
    authStore.logout();
  }
}
</script>

<style scoped>
.profile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.profile-dialog {
  background: white;
  border-radius: 12px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.profile-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f0f0f0;
}

.profile-body {
  padding: 20px;
}

.profile-info {
  margin-bottom: 20px;
}

.profile-user {
  font-size: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.token-summary h3 {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.token-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.token-stat {
  font-size: 14px;
  color: #333;
}

.token-stat.warning {
  color: #ff9800;
}

.profile-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-btn {
  padding: 12px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.profile-btn.primary {
  background: #6750a4;
  color: white;
}

.profile-btn.primary:hover {
  background: #5a40a0;
}

.profile-btn.action {
  background: #4caf50;
  color: white;
}

.profile-btn.action:hover {
  background: #45a049;
}

.profile-btn.secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.profile-btn.secondary:hover {
  background: #e8e8e8;
}

@media (prefers-color-scheme: dark) {
  .profile-dialog {
    background: #1e1e1e;
  }

  .profile-header h2 {
    color: #e0e0e0;
  }

  .profile-header,
  .profile-user {
    border-color: #333;
  }

  .close-btn {
    color: #aaa;
  }

  .close-btn:hover {
    background: #333;
  }

  .token-stat {
    color: #e0e0e0;
  }

  .profile-btn.action {
    background: #2e7d32;
  }

  .profile-btn.action:hover {
    background: #388e3c;
  }

  .profile-btn.secondary {
    background: #2a2a2a;
    color: #e0e0e0;
    border-color: #555;
  }

  .profile-btn.secondary:hover {
    background: #333;
  }
}
</style>
