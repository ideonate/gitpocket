<template>
  <div class="new-issue-modal-overlay" @click.self="$emit('close')">
    <div class="new-issue-modal">
      <div class="new-issue-modal-header">
        <h3>New Issue</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="new-issue-modal-body">
        <div class="form-group">
          <label>Repository</label>
          <div class="repo-name">{{ owner }}/{{ repo }}</div>
        </div>
        <div class="form-group">
          <label for="issue-title">Title</label>
          <input
            id="issue-title"
            v-model="title"
            type="text"
            class="form-input"
            placeholder="Issue title"
            :disabled="submitting"
          />
        </div>
        <div class="form-group">
          <label for="issue-body">Description</label>
          <textarea
            id="issue-body"
            v-model="body"
            class="form-textarea"
            placeholder="Describe the issue..."
            :disabled="submitting"
          ></textarea>
        </div>
        <div class="form-group">
          <label for="issue-assignee">Assignee (optional)</label>
          <input
            id="issue-assignee"
            v-model="assignee"
            type="text"
            class="form-input"
            placeholder="GitHub username"
            :disabled="submitting"
            list="assignee-suggestions"
          />
          <datalist id="assignee-suggestions">
            <option v-for="user in suggestedAssignees" :key="user" :value="user" />
          </datalist>
        </div>
      </div>
      <div class="new-issue-modal-footer">
        <button class="cancel-btn" @click="$emit('close')">Cancel</button>
        <button
          class="create-btn"
          :disabled="!title.trim() || submitting"
          @click="submitIssue"
        >
          {{ submitting ? 'Creating...' : 'Create Issue' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useGitHub } from '../../composables/useGitHub';
import { useAppStore } from '../../stores/app';

const props = defineProps({
  owner: {
    type: String,
    required: true
  },
  repo: {
    type: String,
    required: true
  },
  defaultAssignee: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'created']);

const { createIssue } = useGitHub();
const appStore = useAppStore();

const title = ref('');
const body = ref('');
const assignee = ref(props.defaultAssignee);
const submitting = ref(false);

const suggestedAssignees = computed(() => Array.from(appStore.suggestedAssignees));

async function submitIssue() {
  if (!title.value.trim() || submitting.value) return;

  submitting.value = true;
  try {
    const issueData = {
      title: title.value.trim(),
      body: body.value.trim() || undefined
    };

    if (assignee.value.trim()) {
      issueData.assignees = [assignee.value.trim()];
    }

    const newIssue = await createIssue(props.owner, props.repo, issueData);
    newIssue.repository_name = `${props.owner}/${props.repo}`;

    emit('created', newIssue);
  } catch (error) {
    appStore.showError('Failed to create issue: ' + error.message);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.new-issue-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 20px;
}

.new-issue-modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.new-issue-modal-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.new-issue-modal-header h3 {
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

.new-issue-modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin-bottom: 6px;
}

.repo-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.form-input {
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

.form-input:focus {
  border-color: #6750a4;
}

.form-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  color: #333;
  background: white;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-textarea:focus {
  border-color: #6750a4;
}

.new-issue-modal-footer {
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
  .new-issue-modal {
    background: #1e1e1e;
  }

  .new-issue-modal-header {
    border-bottom-color: #404040;
  }

  .new-issue-modal-header h3 {
    color: #e0e0e0;
  }

  .close-btn {
    color: #999;
  }

  .close-btn:hover {
    background: #2d2d2d;
  }

  .form-group label {
    color: #999;
  }

  .repo-name {
    color: #e0e0e0;
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

  .new-issue-modal-footer {
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
