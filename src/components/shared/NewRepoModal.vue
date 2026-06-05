<template>
  <div class="new-repo-modal-overlay" @click.self="$emit('close')">
    <div class="new-repo-modal">
      <div class="new-repo-modal-header">
        <h3>New Repository</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="new-repo-modal-body">
        <div class="form-group">
          <label for="repo-owner">Owner</label>
          <select
            id="repo-owner"
            v-model="selectedOwner"
            class="form-input"
            :disabled="submitting || loadingOwners"
          >
            <option v-for="owner in owners" :key="owner.login" :value="owner.login">
              {{ owner.login }}{{ owner.isOrg ? ' (org)' : '' }}
            </option>
          </select>
          <div v-if="loadingOwners" class="field-hint">Loading organizations…</div>
        </div>

        <div class="form-group">
          <label for="repo-name">Repository name</label>
          <input
            id="repo-name"
            v-model="name"
            type="text"
            class="form-input"
            placeholder="my-new-repo"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            :disabled="submitting"
            @input="onNameInput"
          />
          <div v-if="nameError" class="field-error">{{ nameError }}</div>
        </div>

        <div class="form-group">
          <label for="repo-description">Description (optional)</label>
          <textarea
            id="repo-description"
            v-model="description"
            class="form-textarea"
            placeholder="A short description of your repository"
            :disabled="submitting"
          ></textarea>
        </div>

        <div class="form-group">
          <label>Visibility</label>
          <div class="visibility-options">
            <label class="radio-option" :class="{ active: visibility === 'private' }">
              <input type="radio" value="private" v-model="visibility" :disabled="submitting" />
              <span>🔒 Private</span>
            </label>
            <label class="radio-option" :class="{ active: visibility === 'public' }">
              <input type="radio" value="public" v-model="visibility" :disabled="submitting" />
              <span>🌐 Public</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="checkbox-option">
            <input type="checkbox" v-model="autoInit" :disabled="submitting" />
            <span>Initialize with a README</span>
          </label>
        </div>

        <div class="perms-note">
          ℹ️ Creating a repository needs a token with creation rights —
          classic: the <strong>repo</strong> scope; fine-grained:
          <strong>Administration</strong> write access (authorised for the org when creating under one).
        </div>
      </div>
      <div class="new-repo-modal-footer">
        <button class="cancel-btn" @click="$emit('close')">Cancel</button>
        <button
          class="create-btn"
          :disabled="!canSubmit"
          @click="submitRepo"
        >
          {{ submitting ? 'Creating…' : 'Create Repository' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useGitHub } from '../../composables/useGitHub';
import { useAuthStore } from '../../stores/auth';
import { useAppStore } from '../../stores/app';

const emit = defineEmits(['close', 'created']);

const { createRepository } = useGitHub();
const authStore = useAuthStore();
const appStore = useAppStore();

const owners = ref([]);
const selectedOwner = ref('');
const loadingOwners = ref(false);

const name = ref('');
const description = ref('');
const visibility = ref('private');
const autoInit = ref(true);
const submitting = ref(false);
const nameError = ref('');

const canSubmit = computed(() =>
  name.value.trim() && !nameError.value && selectedOwner.value && !submitting.value
);

function onNameInput() {
  const value = name.value.trim();
  if (value && !/^[A-Za-z0-9_.-]+$/.test(value)) {
    nameError.value = 'Use only letters, numbers, hyphens, underscores and dots.';
  } else {
    nameError.value = '';
  }
}

onMounted(async () => {
  // Personal account first
  const personalLogin = authStore.user?.login;
  const ownerList = [];
  if (personalLogin) {
    ownerList.push({ login: personalLogin, isOrg: false });
  }

  // Orgs that already have dedicated tokens
  Object.keys(authStore.orgTokens || {}).forEach(orgName => {
    if (!ownerList.some(o => o.login === orgName)) {
      ownerList.push({ login: orgName, isOrg: true });
    }
  });

  owners.value = ownerList;
  selectedOwner.value = ownerList[0]?.login || '';

  // Discover additional orgs via the API
  loadingOwners.value = true;
  try {
    const result = await authStore.fetchUserOrganizations();
    if (result.success) {
      result.orgs.forEach(org => {
        if (!owners.value.some(o => o.login === org.login)) {
          owners.value.push({ login: org.login, isOrg: true });
        }
      });
    }
  } catch (e) {
    // Non-fatal: the user can still create under any owner already listed
    console.warn('Failed to load organizations for repo creation:', e);
  } finally {
    loadingOwners.value = false;
  }
});

async function submitRepo() {
  if (!canSubmit.value) return;

  const ownerInfo = owners.value.find(o => o.login === selectedOwner.value);
  if (!ownerInfo) {
    appStore.showError('Please select a valid owner.');
    return;
  }

  submitting.value = true;
  try {
    const repoData = {
      name: name.value.trim(),
      private: visibility.value === 'private',
      auto_init: autoInit.value
    };
    const desc = description.value.trim();
    if (desc) repoData.description = desc;

    const newRepo = await createRepository(ownerInfo, repoData);
    emit('created', newRepo);
  } catch (error) {
    appStore.showError('Failed to create repository: ' + error.message);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.new-repo-modal-overlay {
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

.new-repo-modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.new-repo-modal-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.new-repo-modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f5f5f5;
}

.new-repo-modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group > label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin-bottom: 6px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  color: #333;
  background: white;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-textarea {
  min-height: 80px;
  resize: vertical;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #6750a4;
}

.field-hint {
  font-size: 12px;
  color: #888;
  margin-top: 6px;
}

.field-error {
  font-size: 12px;
  color: #e53935;
  margin-top: 6px;
}

.visibility-options {
  display: flex;
  gap: 10px;
}

.radio-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: border-color 0.2s, background 0.2s;
}

.radio-option.active {
  border-color: #6750a4;
  background: rgba(103, 80, 164, 0.06);
}

.radio-option input {
  display: none;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

.perms-note {
  font-size: 12px;
  line-height: 1.5;
  color: #666;
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
}

.new-repo-modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  background: #f5f5f5;
  color: #666;
  transition: background 0.2s;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.create-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  background: #6750a4;
  color: white;
  transition: background 0.2s;
}

.create-btn:hover:not(:disabled) {
  background: #5a4594;
}

.create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (prefers-color-scheme: dark) {
  .new-repo-modal {
    background: #1e1e1e;
  }

  .new-repo-modal-header {
    border-bottom-color: #404040;
  }

  .new-repo-modal-header h3 {
    color: #e0e0e0;
  }

  .close-btn {
    color: #999;
  }

  .close-btn:hover {
    background: #2d2d2d;
  }

  .form-group > label {
    color: #999;
  }

  .form-input,
  .form-textarea {
    background: #2d2d2d;
    border-color: #404040;
    color: #e0e0e0;
  }

  .form-input:focus,
  .form-textarea:focus {
    border-color: #7a5fb2;
  }

  .radio-option {
    border-color: #404040;
    color: #e0e0e0;
  }

  .radio-option.active {
    border-color: #7a5fb2;
    background: rgba(122, 95, 178, 0.15);
  }

  .checkbox-option {
    color: #e0e0e0;
  }

  .perms-note {
    background: #2d2d2d;
    color: #aaa;
  }

  .new-repo-modal-footer {
    border-top-color: #404040;
  }

  .cancel-btn {
    background: #2d2d2d;
    color: #999;
  }

  .cancel-btn:hover {
    background: #404040;
  }

  .create-btn {
    background: #7a5fb2;
  }

  .create-btn:hover:not(:disabled) {
    background: #6750a4;
  }
}
</style>
