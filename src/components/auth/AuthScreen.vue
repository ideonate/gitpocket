<template>
  <div class="auth-screen">
    <div class="auth-container">
      <div class="auth-logo">🐙</div>
      <h1 class="auth-title">GitPocket</h1>
      <p class="auth-subtitle">Manage GitHub on the go</p>

      <div class="auth-buttons">
        <button class="auth-btn primary" @click="quickSetup">
          <span class="auth-btn-icon">🚀</span>
          <span class="auth-btn-text">Quick Setup</span>
        </button>

        <button class="auth-btn secondary" @click="showTokenManagement = true">
          <span class="auth-btn-icon">⚙️</span>
          <span class="auth-btn-text">Advanced Token Management</span>
        </button>
      </div>

      <div class="auth-info">
        <h3>Required Permissions:</h3>
        <ul>
          <li>Issues: Read and Write</li>
          <li>Pull requests: Read and Write</li>
          <li>Metadata: Read</li>
        </ul>

        <p class="auth-note">
          💡 For organization repositories, you may need separate tokens with appropriate permissions.
        </p>
      </div>

      <div v-if="error" class="auth-error">{{ error }}</div>
    </div>

    <TokenManagement
      v-if="showTokenManagement"
      @close="showTokenManagement = false"
      @token-added="onTokenAdded"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import TokenManagement from './TokenManagement.vue';

const emit = defineEmits(['authenticated']);

const authStore = useAuthStore();
const showTokenManagement = ref(false);
const error = ref('');

async function quickSetup() {
  const token = prompt(
    'Enter your Personal GitHub Access Token:\n\n' +
    '🔑 For FINE-GRAINED tokens (Recommended):\n' +
    '1. Go to github.com/settings/personal-access-tokens/fine-grained\n' +
    '2. Generate new token\n' +
    '3. Repository access: "All repositories" or select specific repos\n' +
    '4. Set permissions:\n' +
    '   • Issues: Read and Write\n' +
    '   • Pull requests: Read and Write\n' +
    '   • Metadata: Read\n\n' +
    '🔑 For CLASSIC tokens:\n' +
    '1. Go to github.com/settings/tokens\n' +
    '2. Generate new token (classic)\n' +
    '3. Select scopes: repo (full), write:discussion'
  );

  if (!token) return;

  try {
    const result = await authStore.validateToken(token, 'Personal');

    if (result.valid) {
      if (result.repoAccessError) {
        const proceed = confirm(
          `⚠️ Warning: ${result.repoAccessError}\n\n` +
          `This token may not have access to any repositories.\n\n` +
          `Do you still want to add this token?`
        );
        if (!proceed) return;
      }

      authStore.setPersonalToken(result);
      emit('authenticated');
    } else {
      error.value = `Invalid token: ${result.error}`;
    }
  } catch (e) {
    error.value = `Error validating token: ${e.message}`;
  }
}

function onTokenAdded() {
  showTokenManagement.value = false;
  if (authStore.hasAnyToken) {
    emit('authenticated');
  }
}
</script>

<style scoped>
.auth-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.auth-container {
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.auth-logo {
  font-size: 64px;
  margin-bottom: 20px;
}

.auth-title {
  font-size: 28px;
  margin: 0 0 8px 0;
  color: #333;
}

.auth-subtitle {
  color: #666;
  margin: 0 0 30px 0;
}

.auth-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 30px;
}

.auth-btn {
  padding: 14px 20px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.auth-btn.primary {
  background: #6750a4;
  color: white;
}

.auth-btn.primary:hover {
  background: #5a40a0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(103, 80, 164, 0.3);
}

.auth-btn.secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.auth-btn.secondary:hover {
  background: #e8e8e8;
}

.auth-btn-icon {
  font-size: 20px;
}

.auth-info {
  text-align: left;
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
}

.auth-info h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
}

.auth-info ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
  font-size: 14px;
}

.auth-info li {
  margin-bottom: 4px;
}

.auth-note {
  margin: 12px 0 0 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.auth-error {
  background: #ffebee;
  color: #c62828;
  padding: 12px;
  border-radius: 8px;
  margin-top: 16px;
  font-size: 14px;
}

@media (prefers-color-scheme: dark) {
  .auth-container {
    background: #1e1e1e;
  }

  .auth-title {
    color: #e0e0e0;
  }

  .auth-subtitle {
    color: #aaa;
  }

  .auth-btn.secondary {
    background: #333;
    color: #e0e0e0;
    border-color: #555;
  }

  .auth-btn.secondary:hover {
    background: #444;
  }

  .auth-info {
    background: #2a2a2a;
  }

  .auth-info h3,
  .auth-info ul,
  .auth-note {
    color: #aaa;
  }
}
</style>
