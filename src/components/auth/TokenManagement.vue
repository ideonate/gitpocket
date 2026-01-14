<template>
  <div class="token-management-overlay" @click.self="$emit('close')">
    <div class="token-management-modal">
      <div class="token-management-header">
        <h2>🔐 GitHub Token Management</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="token-management-body">
        <div class="token-section">
          <h3>Personal Access Token</h3>
          <p class="token-description">
            Your personal token is used for accessing your repositories and as a fallback for organization repositories.
          </p>

          <div v-if="authStore.personalToken" class="token-status active">
            ✅ Active: {{ authStore.personalToken.user?.login }} ({{ authStore.personalToken.scopes }})
            <div v-if="authStore.personalToken.repoCount" class="repo-info">
              📚 {{ authStore.personalToken.repoCount }}+ repos accessible
            </div>
          </div>
          <div v-else class="token-status missing">
            ⚠️ No personal token configured
          </div>

          <button class="add-token-btn" @click="addPersonalToken">
            {{ authStore.personalToken ? '🔄 Replace Personal Token' : '➕ Add Personal Token' }}
          </button>
        </div>

        <div class="token-section">
          <h3>Organization Tokens</h3>
          <p class="token-description">
            Add specific tokens for organization repositories when your personal token doesn't have sufficient permissions.
          </p>
          <button class="add-token-btn" @click="addOrgToken">➕ Add Organization Token</button>
        </div>

        <div class="token-list">
          <h3>Active Tokens</h3>
          <div v-if="authStore.allTokens.length === 0" class="no-tokens">
            No tokens configured yet.
          </div>
          <div v-for="token in authStore.allTokens" :key="token.name" class="token-item">
            <div class="token-info">
              <div class="token-name">{{ token.name }}</div>
              <div class="token-details">
                User: {{ token.user?.login }} | {{ token.scopes }}
                <span v-if="token.repoCount" class="repo-count">
                  | 📚 {{ token.repoCount }}+ repos
                </span>
              </div>
              <div v-if="token.lastError" class="token-error">
                ❌ {{ token.lastError }}
              </div>
            </div>
            <div v-if="token.type === 'organization'" class="token-actions">
              <button class="token-action-btn danger" @click="removeOrgToken(token.orgName)">
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="token-management-footer">
        <button class="primary-btn" @click="$emit('close')">Done</button>
      </div>
    </div>

    <!-- Organization Selection Modal -->
    <div v-if="showOrgSelection" class="org-selection-overlay" @click.self="showOrgSelection = false">
      <div class="org-selection-modal">
        <h2>Select Organization</h2>
        <p>Choose an organization to add a token for:</p>

        <div v-if="loadingOrgs" class="loading-orgs">
          <div class="spinner"></div>
          Loading organizations...
        </div>

        <div v-else class="org-list">
          <div
            v-for="org in organizations"
            :key="org.login"
            class="org-item"
            @click="selectOrg(org)"
          >
            <img v-if="org.avatar_url" :src="org.avatar_url" :alt="org.login" class="org-avatar" />
            <div class="org-info">
              <div class="org-name">
                {{ org.name }}
                <span v-if="org.inferred" class="inferred-badge">(inferred)</span>
              </div>
              <div class="org-login">@{{ org.login }}</div>
            </div>
          </div>
        </div>

        <div class="manual-entry">
          <p>Can't see your organization? Enter its name manually:</p>
          <input
            v-model="manualOrgName"
            type="text"
            placeholder="e.g., microsoft, facebook"
          />
          <button class="add-manual-btn" @click="addManualOrg">Add Manual Organization</button>
        </div>

        <div class="org-selection-footer">
          <button class="cancel-btn" @click="showOrgSelection = false">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';

const emit = defineEmits(['close', 'token-added']);

const authStore = useAuthStore();
const showOrgSelection = ref(false);
const loadingOrgs = ref(false);
const organizations = ref([]);
const manualOrgName = ref('');

async function addPersonalToken() {
  const token = prompt(
    'Enter your Personal GitHub Access Token:\n\n' +
    '🔑 For FINE-GRAINED tokens:\n' +
    '• Issues: Read and Write\n' +
    '• Pull requests: Read and Write\n' +
    '• Metadata: Read\n\n' +
    '🔑 For CLASSIC tokens:\n' +
    '• Select scopes: repo (full)'
  );

  if (!token) return;

  const result = await authStore.validateToken(token, 'Personal');
  if (result.valid) {
    authStore.setPersonalToken(result);
    emit('token-added');
  } else {
    alert(`❌ Invalid token: ${result.error}`);
  }
}

async function addOrgToken() {
  showOrgSelection.value = true;
  loadingOrgs.value = true;

  try {
    const result = await authStore.fetchUserOrganizations();
    if (result.success) {
      organizations.value = result.orgs;
    } else {
      organizations.value = [];
    }
  } catch (e) {
    console.error('Failed to fetch organizations:', e);
    organizations.value = [];
  } finally {
    loadingOrgs.value = false;
  }
}

async function selectOrg(org) {
  showOrgSelection.value = false;
  await requestOrgToken(org.login);
}

async function addManualOrg() {
  const orgName = manualOrgName.value.trim();
  if (!orgName) return;

  showOrgSelection.value = false;
  manualOrgName.value = '';
  await requestOrgToken(orgName);
}

async function requestOrgToken(orgName) {
  const token = prompt(
    `Enter a GitHub token with access to ${orgName} organization:\n\n` +
    '⚠️ Organization-specific requirements:\n' +
    '• The organization must allow your token type\n' +
    '• For fine-grained tokens, you may need org approval\n' +
    '• Ensure the token has Issues and Pull requests write permissions'
  );

  if (!token) return;

  const result = await authStore.validateToken(token, `${orgName} Organization`, orgName);
  if (result.valid) {
    authStore.setOrgToken(orgName, result);
    emit('token-added');
  } else {
    alert(`❌ Invalid token: ${result.error}`);
  }
}

function removeOrgToken(orgName) {
  if (confirm(`Remove token for ${orgName} organization?`)) {
    authStore.removeOrgToken(orgName);
  }
}
</script>

<style scoped>
.token-management-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.token-management-modal {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.token-management-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.token-management-header h2 {
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

.token-management-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.token-section {
  margin-bottom: 30px;
}

.token-section h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #333;
}

.token-description {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.token-status {
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 14px;
}

.token-status.active {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #4caf50;
}

.token-status.missing {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ff9800;
}

.repo-info {
  margin-top: 4px;
  font-size: 12px;
  color: #51cf66;
}

.add-token-btn {
  background: #6750a4;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.add-token-btn:hover {
  background: #5a40a0;
}

.token-list {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.token-list h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
}

.no-tokens {
  color: #666;
  font-size: 14px;
}

.token-item {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.token-info {
  flex: 1;
}

.token-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.token-details {
  font-size: 12px;
  color: #666;
}

.repo-count {
  color: #51cf66;
}

.token-error {
  font-size: 11px;
  color: #ff6b6b;
  margin-top: 4px;
}

.token-actions {
  display: flex;
  gap: 8px;
}

.token-action-btn {
  background: none;
  border: 1px solid #ddd;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.token-action-btn.danger {
  color: #d32f2f;
  border-color: #d32f2f;
}

.token-action-btn.danger:hover {
  background: #ffebee;
}

.token-management-footer {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
}

.primary-btn {
  background: #6750a4;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-btn:hover {
  background: #5a40a0;
}

/* Org Selection Modal */
.org-selection-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.org-selection-modal {
  background: white;
  border-radius: 12px;
  padding: 20px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.org-selection-modal h2 {
  margin: 0 0 8px 0;
}

.org-selection-modal > p {
  color: #666;
  margin-bottom: 20px;
}

.loading-orgs {
  text-align: center;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #6750a4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.org-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.org-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.org-item:hover {
  background: #f3f4f6;
}

.org-avatar {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  margin-right: 12px;
}

.org-info {
  flex: 1;
}

.org-name {
  font-weight: 600;
  color: #333;
}

.inferred-badge {
  font-size: 0.8em;
  color: #f59e0b;
  font-weight: normal;
}

.org-login {
  font-size: 0.9em;
  color: #6b7280;
}

.manual-entry {
  border-top: 1px solid #e5e7eb;
  padding-top: 15px;
  margin-top: 15px;
}

.manual-entry p {
  font-size: 0.9em;
  color: #6b7280;
  margin-bottom: 10px;
}

.manual-entry input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 10px;
  box-sizing: border-box;
}

.add-manual-btn {
  padding: 8px 16px;
  background: #6750a4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.org-selection-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.cancel-btn {
  padding: 8px 16px;
  background: #e5e7eb;
  color: #374151;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .token-management-modal,
  .org-selection-modal {
    background: #1e1e1e;
  }

  .token-management-header h2,
  .token-section h3,
  .token-list h3,
  .token-name,
  .org-selection-modal h2,
  .org-name {
    color: #e0e0e0;
  }

  .token-management-header,
  .token-management-footer,
  .token-list {
    border-color: #333;
  }

  .close-btn {
    color: #aaa;
  }

  .close-btn:hover {
    background: #333;
  }

  .token-description,
  .token-details,
  .no-tokens {
    color: #aaa;
  }

  .token-item {
    background: #2a2a2a;
  }

  .token-action-btn {
    border-color: #555;
    color: #e0e0e0;
  }

  .token-action-btn:hover {
    background: #333;
  }

  .org-item {
    border-color: #444;
  }

  .org-item:hover {
    background: #333;
  }

  .manual-entry input {
    background: #2a2a2a;
    border-color: #444;
    color: #e0e0e0;
  }

  .cancel-btn {
    background: #333;
    color: #e0e0e0;
  }
}
</style>
