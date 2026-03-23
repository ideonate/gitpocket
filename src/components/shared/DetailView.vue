<template>
  <Transition name="slide">
    <div v-if="appStore.detailVisible" class="detail-screen">
      <div class="detail-header">
        <button class="back-btn" @click="closeDetail">←</button>
        <div class="detail-title">{{ detailTitle }}</div>
        <div class="detail-actions">
          <button
            v-if="appStore.currentItemType === 'issue'"
            class="icon-btn"
            @click="showNewIssueModal = true"
            title="New Issue"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button class="icon-btn" @click="refreshDetail" title="Refresh">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="detail-content">
        <!-- Issue/PR Detail -->
        <div v-if="appStore.currentItemType === 'issue' || appStore.currentItemType === 'pr'" class="detail-card">
          <div class="detail-header-badges">
            <span class="status-badge" :class="statusClass">
              {{ item?.state }}
            </span>
            <span v-if="item?.draft" class="status-badge status-draft">Draft</span>
          </div>

          <h2 class="detail-title-text">{{ item?.title }}</h2>

          <div class="detail-meta">
            <a :href="`https://github.com/${item?.repository_name}`" target="_blank" class="repo-link">
              📁 {{ item?.repository_name }}
            </a>
            <span> · #{{ item?.number }}</span>
            <span> · {{ item?.user?.login }}</span>
            <span> · {{ formatDate(item?.created_at) }}</span>
          </div>

          <a v-if="item?.html_url" :href="item.html_url" target="_blank" class="view-link">
            View on GitHub →
          </a>

          <!-- Assignee Section -->
          <div class="assignee-section" @click="showAssigneeModal = true">
            <span class="assignee-label">Assignees:</span>
            <div class="assignee-list">
              <template v-if="item?.assignees?.length > 0">
                <span v-for="assignee in item.assignees" :key="assignee.login" class="assignee-chip">
                  <img v-if="assignee.avatar_url" :src="assignee.avatar_url" class="assignee-avatar" :alt="assignee.login">
                  {{ assignee.login }}
                </span>
              </template>
              <span v-else class="no-assignee">None</span>
            </div>
            <span class="edit-icon">✎</span>
          </div>

          <div v-if="item?.body" class="detail-body" v-html="formatBody(item.body)"></div>

          <!-- Reactions -->
          <ReactionDisplay
            v-if="item"
            :reactions="appStore.issueReactions"
            :item-id="item.number"
            :owner="owner"
            :repo="repo"
          />

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button
              class="action-btn"
              :class="{ 'state-closed': item?.state === 'closed', 'state-open': item?.state === 'open' }"
              @click="toggleState"
            >
              {{ item?.state === 'open' ? 'Close' : 'Reopen' }}
            </button>

            <button
              v-if="appStore.currentItemType === 'pr' && item?.state === 'open'"
              class="action-btn merge"
              @click="showMergeOptions = true"
            >
              Merge PR
            </button>
          </div>
        </div>

        <!-- Workflow Run Detail -->
        <div v-else-if="appStore.currentItemType === 'action'" class="detail-card">
          <div class="detail-header-badges">
            <span class="status-badge" :class="workflowStatusClass">
              {{ item?.conclusion || item?.status }}
            </span>
          </div>

          <h2 class="detail-title-text">{{ item?.name }}</h2>

          <div class="detail-meta">
            <a :href="`https://github.com/${item?.repository_name}`" target="_blank" class="repo-link">
              📁 {{ item?.repository_name }}
            </a>
            <span> · {{ item?.head_branch }}</span>
            <span> · {{ formatDate(item?.created_at) }}</span>
          </div>

          <div class="workflow-info">
            <div><strong>Run ID:</strong> {{ item?.id }}</div>
            <div><strong>Event:</strong> {{ item?.event }}</div>
            <div><strong>Actor:</strong> {{ item?.actor?.login }}</div>
            <a v-if="item?.html_url" :href="item.html_url" target="_blank" class="view-link">
              View on GitHub →
            </a>
          </div>

          <button
            v-if="supportsDispatch"
            class="action-btn run-again"
            @click="triggerWorkflow"
          >
            ▶ Run Again
          </button>
        </div>

        <!-- Project Detail -->
        <div v-else-if="appStore.currentItemType === 'project'" class="detail-card">
          <div class="detail-header-badges">
            <span class="status-badge" :class="item?.closed ? 'status-closed' : 'status-open'">
              {{ item?.closed ? 'closed' : 'open' }}
            </span>
          </div>

          <h2 class="detail-title-text">{{ item?.title }}</h2>

          <div class="detail-meta">
            <span>👤 {{ item?.owner_name }}</span>
            <span> · {{ item?.items_count }} items</span>
            <span> · {{ formatDate(item?.updatedAt) }}</span>
          </div>

          <a v-if="item?.url" :href="item.url" target="_blank" class="view-link">
            View on GitHub →
          </a>

          <div v-if="item?.shortDescription" class="detail-body">{{ item.shortDescription }}</div>

          <!-- Project Items grouped by status -->
          <div v-if="loadingProjectItems" class="project-items-loading">
            Loading items...
          </div>
          <div v-else-if="groupedProjectItems.length > 0" class="project-items-section">
            <div v-for="group in groupedProjectItems" :key="group.status" class="project-status-group">
              <h4 class="status-group-header" @click="toggleProjectGroup(group.status)">
                <span class="status-group-label">{{ group.status }}</span>
                <span class="status-group-count">({{ group.items.length }})</span>
                <span class="group-chevron" :class="{ 'is-collapsed': collapsedProjectGroups.includes(group.status) }">›</span>
              </h4>
              <div v-if="!collapsedProjectGroups.includes(group.status)">
                <div v-for="pItem in group.items" :key="pItem.id" class="project-item" @click="selectedProjectItem = pItem">
                  <span v-if="pItem.state" class="project-item-state" :class="pItem.state === 'OPEN' ? 'state-open-dot' : 'state-closed-dot'"></span>
                  <span v-else class="project-item-state state-draft-dot"></span>
                  <span class="project-item-title">{{ pItem.title }}</span>
                  <span v-if="pItem.number" class="project-item-number">#{{ pItem.number }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Project Item Detail Modal -->
          <div v-if="selectedProjectItem" class="project-item-modal-overlay" @click.self="selectedProjectItem = null">
            <div class="project-item-modal">
              <div class="project-item-modal-header">
                <h3>{{ selectedProjectItem.title }}</h3>
                <button class="close-modal-btn" @click="selectedProjectItem = null">×</button>
              </div>
              <div class="project-item-modal-body">
                <div class="project-item-detail-row">
                  <span class="detail-label">Status</span>
                  <span class="detail-value">{{ selectedProjectItem.status }}</span>
                </div>
                <div v-if="selectedProjectItem.state" class="project-item-detail-row">
                  <span class="detail-label">State</span>
                  <span class="status-badge" :class="selectedProjectItem.state === 'OPEN' ? 'status-open' : 'status-closed'">
                    {{ selectedProjectItem.state.toLowerCase() }}
                  </span>
                </div>
                <div v-if="selectedProjectItem.isDraft" class="project-item-detail-row">
                  <span class="detail-label">Type</span>
                  <span class="detail-value">Draft Issue</span>
                </div>
                <div v-if="selectedProjectItem.repository" class="project-item-detail-row">
                  <span class="detail-label">Repository</span>
                  <span class="detail-value">{{ selectedProjectItem.repository }}</span>
                </div>
                <div v-if="selectedProjectItem.number" class="project-item-detail-row">
                  <span class="detail-label">Number</span>
                  <span class="detail-value">#{{ selectedProjectItem.number }}</span>
                </div>
                <a v-if="selectedProjectItem.url" :href="selectedProjectItem.url" target="_blank" class="view-link" style="margin-top: 8px;">
                  View on GitHub →
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Comments Section -->
        <div v-if="appStore.currentItemType !== 'action' && appStore.currentItemType !== 'project'" class="comments-section">
          <h3>Comments ({{ appStore.comments.length }})</h3>
          <CommentCard
            v-for="comment in appStore.comments"
            :key="comment.id"
            :comment="comment"
            :owner="owner"
            :repo="repo"
          />
        </div>
      </div>

      <!-- Comment FAB -->
      <button
        v-if="appStore.currentItemType !== 'action' && appStore.currentItemType !== 'project'"
        class="comment-fab"
        @click="showCommentModal = true"
      >
        💬
      </button>

      <!-- Comment Modal -->
      <CommentModal
        v-if="showCommentModal"
        :owner="owner"
        :repo="repo"
        :number="item?.number"
        @close="showCommentModal = false"
        @submitted="onCommentSubmitted"
      />

      <!-- Merge Options Modal -->
      <div v-if="showMergeOptions" class="merge-modal-overlay" @click.self="showMergeOptions = false">
        <div class="merge-modal">
          <h3>Merge Pull Request</h3>
          <div class="merge-options">
            <button @click="mergePR('merge')">Create a merge commit</button>
            <button @click="mergePR('squash')">Squash and merge</button>
            <button @click="mergePR('rebase')">Rebase and merge</button>
          </div>
          <button class="cancel-btn" @click="showMergeOptions = false">Cancel</button>
        </div>
      </div>

      <!-- Assignee Modal -->
      <div v-if="showAssigneeModal" class="assignee-modal-overlay" @click.self="showAssigneeModal = false">
        <div class="assignee-modal">
          <h3>Edit Assignees</h3>
          <div class="assignee-input-container">
            <input
              v-model="assigneeInput"
              type="text"
              placeholder="Type username..."
              class="assignee-input"
              @keydown.enter="addAssignee"
            >
            <button class="add-assignee-btn" @click="addAssignee">Add</button>
          </div>

          <!-- Current assignees -->
          <div class="current-assignees">
            <div v-for="assignee in selectedAssignees" :key="assignee" class="selected-assignee">
              <span>{{ assignee }}</span>
              <button class="remove-assignee-btn" @click="removeAssignee(assignee)">×</button>
            </div>
          </div>

          <!-- Suggestions -->
          <div v-if="filteredSuggestions.length > 0" class="assignee-suggestions">
            <div class="suggestions-label">Suggestions:</div>
            <div
              v-for="suggestion in filteredSuggestions"
              :key="suggestion"
              class="suggestion-item"
              @click="addSuggestion(suggestion)"
            >
              {{ suggestion }}
            </div>
          </div>

          <div class="assignee-modal-actions">
            <button class="cancel-btn" @click="showAssigneeModal = false">Cancel</button>
            <button class="save-btn" @click="saveAssignees" :disabled="savingAssignees">
              {{ savingAssignees ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>

      <!-- New Issue Modal -->
      <NewIssueModal
        v-if="showNewIssueModal"
        :owner="owner"
        :repo="repo"
        :default-assignee="item?.assignees?.[0]?.login || ''"
        @close="showNewIssueModal = false"
        @created="onIssueCreated"
      />
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useAppStore } from '../../stores/app';
import { useGitHub } from '../../composables/useGitHub';
import CommentCard from './CommentCard.vue';
import CommentModal from './CommentModal.vue';
import ReactionDisplay from './ReactionDisplay.vue';
import NewIssueModal from './NewIssueModal.vue';

const appStore = useAppStore();
const {
  loadComments,
  loadIssueReactions,
  updateIssueState,
  mergePullRequest,
  canTriggerWorkflow,
  triggerWorkflowDispatch,
  updateAssignees,
  refreshData,
  loadProjectItems
} = useGitHub();

const showCommentModal = ref(false);
const showMergeOptions = ref(false);
const supportsDispatch = ref(false);
const showAssigneeModal = ref(false);
const showNewIssueModal = ref(false);
const loadingProjectItems = ref(false);
const assigneeInput = ref('');
const selectedAssignees = ref([]);
const savingAssignees = ref(false);

const item = computed(() => appStore.currentItem);

const owner = computed(() => {
  const repoName = item.value?.repository_name;
  return repoName ? repoName.split('/')[0] : '';
});

const repo = computed(() => {
  const repoName = item.value?.repository_name;
  return repoName ? repoName.split('/')[1] : '';
});

const detailTitle = computed(() => {
  if (!item.value) return '';
  if (appStore.currentItemType === 'action') {
    return item.value.name || 'Workflow Run';
  }
  if (appStore.currentItemType === 'project') {
    return item.value.title || 'Project';
  }
  const type = appStore.currentItemType === 'issue' ? 'Issue' : 'PR';
  return `${type} #${item.value.number}`;
});

const STATUS_ORDER = ['backlog', 'ready', 'in progress', 'in review', 'done'];

const collapsedProjectGroups = ref([]);
const selectedProjectItem = ref(null);

const groupedProjectItems = computed(() => {
  const items = appStore.projectItems;
  if (!items.length) return [];

  const groups = {};
  for (const item of items) {
    const status = item.status || 'No Status';
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(item);
  }

  const result = Object.entries(groups).map(([status, items]) => ({ status, items }));

  result.sort((a, b) => {
    const aIdx = STATUS_ORDER.findIndex(s => s === a.status.toLowerCase());
    const bIdx = STATUS_ORDER.findIndex(s => s === b.status.toLowerCase());
    if (aIdx === -1 && bIdx === -1) return a.status.localeCompare(b.status);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return result;
});

function toggleProjectGroup(status) {
  const idx = collapsedProjectGroups.value.indexOf(status);
  if (idx !== -1) {
    collapsedProjectGroups.value.splice(idx, 1);
  } else {
    collapsedProjectGroups.value.push(status);
  }
}

const statusClass = computed(() => {
  if (!item.value) return '';
  return item.value.state === 'open' ? 'status-open' : 'status-closed';
});

const workflowStatusClass = computed(() => {
  if (!item.value) return '';
  const conclusion = item.value.conclusion || item.value.status;
  switch (conclusion) {
    case 'success': return 'status-success';
    case 'failure': return 'status-failure';
    case 'in_progress': return 'status-in-progress';
    case 'queued': return 'status-queued';
    case 'cancelled': return 'status-cancelled';
    default: return '';
  }
});

// Get users who have been seen on issues/PRs in the current repo only
const repoUsers = computed(() => {
  const users = new Set();
  const repoName = item.value?.repository_name;
  if (!repoName) return [];

  // Get users from issues in the same repo
  appStore.unfilteredIssues
    .filter(issue => issue.repository_name === repoName)
    .forEach(issue => {
      if (issue.user?.login) users.add(issue.user.login);
      issue.assignees?.forEach(a => { if (a.login) users.add(a.login); });
    });

  // Get users from PRs in the same repo
  appStore.unfilteredPullRequests
    .filter(pr => pr.repository_name === repoName)
    .forEach(pr => {
      if (pr.user?.login) users.add(pr.user.login);
      pr.assignees?.forEach(a => { if (a.login) users.add(a.login); });
    });

  return Array.from(users);
});

const filteredSuggestions = computed(() => {
  const suggestions = repoUsers.value;
  const input = assigneeInput.value.toLowerCase();
  return suggestions
    .filter(s => !selectedAssignees.value.includes(s))
    .filter(s => input === '' || s.toLowerCase().includes(input))
    .slice(0, 5);
});

// Load comments and reactions when detail is shown
watch(() => appStore.detailVisible, async (visible) => {
  if (visible && item.value && appStore.currentItemType !== 'action') {
    await loadComments(owner.value, repo.value, item.value.number);
    await loadIssueReactions(owner.value, repo.value, item.value.number);
  }

  // Check workflow dispatch support
  if (visible && item.value && appStore.currentItemType === 'action') {
    supportsDispatch.value = true; // Always show "Run Again" button
  }

  // Load project items
  if (visible && item.value && appStore.currentItemType === 'project') {
    loadingProjectItems.value = true;
    try {
      await loadProjectItems(item.value.id, item.value.owner_name);
    } finally {
      loadingProjectItems.value = false;
    }
  }
}, { immediate: true });

function closeDetail() {
  appStore.clearCurrentItem();
}

async function refreshDetail() {
  if (item.value && appStore.currentItemType !== 'action') {
    await loadComments(owner.value, repo.value, item.value.number);
    await loadIssueReactions(owner.value, repo.value, item.value.number);
    appStore.showSuccess('Refreshed!');
  }
}

async function toggleState() {
  if (!item.value) return;

  try {
    const newState = item.value.state === 'open' ? 'closed' : 'open';
    await updateIssueState(owner.value, repo.value, item.value.number, newState);
    item.value.state = newState;
    appStore.showSuccess(`${appStore.currentItemType === 'issue' ? 'Issue' : 'PR'} ${newState}!`);
  } catch (error) {
    appStore.showError('Failed to update state: ' + error.message);
  }
}

async function mergePR(method) {
  if (!item.value) return;

  try {
    await mergePullRequest(owner.value, repo.value, item.value.number, method);
    showMergeOptions.value = false;
    item.value.state = 'closed';
    appStore.showSuccess('PR merged successfully!');
  } catch (error) {
    appStore.showError('Failed to merge: ' + error.message);
  }
}

async function triggerWorkflow() {
  if (!item.value) return;

  try {
    await triggerWorkflowDispatch(
      owner.value,
      repo.value,
      item.value.workflow_id,
      item.value.head_branch
    );
    appStore.showSuccess('Workflow triggered!');
  } catch (error) {
    appStore.showError('Failed to trigger workflow: ' + error.message);
  }
}

// Populate selected assignees when modal opens
watch(showAssigneeModal, (visible) => {
  if (visible && item.value) {
    selectedAssignees.value = item.value.assignees?.map(a => a.login) || [];
    assigneeInput.value = '';
  }
});

function addAssignee() {
  const username = assigneeInput.value.trim();
  if (username && !selectedAssignees.value.includes(username)) {
    selectedAssignees.value.push(username);
    assigneeInput.value = '';
  }
}

function removeAssignee(username) {
  selectedAssignees.value = selectedAssignees.value.filter(a => a !== username);
}

function addSuggestion(username) {
  if (!selectedAssignees.value.includes(username)) {
    selectedAssignees.value.push(username);
  }
}

async function saveAssignees() {
  if (!item.value) return;

  savingAssignees.value = true;
  try {
    await updateAssignees(owner.value, repo.value, item.value.number, selectedAssignees.value);

    // Update the local item with new assignees
    item.value.assignees = selectedAssignees.value.map(login => ({ login }));

    showAssigneeModal.value = false;
    appStore.showSuccess('Assignees updated!');
  } catch (error) {
    appStore.showError('Failed to update assignees: ' + error.message);
  } finally {
    savingAssignees.value = false;
  }
}

async function onIssueCreated(newIssue) {
  showNewIssueModal.value = false;
  appStore.showSuccess(`Issue #${newIssue.number} created!`);
  // Refresh data to include the new issue in the list
  await refreshData();
  // Open the newly created issue
  appStore.setCurrentItem(newIssue, 'issue');
}

async function onCommentSubmitted() {
  showCommentModal.value = false;
  await loadComments(owner.value, repo.value, item.value.number);
  appStore.showSuccess('Comment added!');
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatBody(body) {
  if (!body) return '';
  // Basic markdown-like formatting
  return body
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}
</script>

<style scoped>
.detail-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  z-index: 200;
  display: flex;
  flex-direction: column;
}

.detail-header {
  height: 56px;
  background: #6750a4;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
  justify-content: space-between;
  flex-shrink: 0;
}

.detail-header > .detail-title {
  flex: 1;
  font-weight: 500;
}

.detail-actions {
  display: flex;
  gap: 8px;
}

.back-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background 0.2s;
}

.back-btn:hover {
  background: rgba(255,255,255,0.1);
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: rgba(255,255,255,0.1);
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px;
}

.detail-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e0e0e0;
  margin-bottom: 16px;
}

.detail-header-badges {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
}

.status-open, .status-success {
  background: #e8f5e8;
  color: #2e7d32;
}

.status-closed, .status-failure {
  background: #ffebee;
  color: #c62828;
}

.status-draft {
  background: #f3e5f5;
  color: #7b1fa2;
}

.status-in-progress {
  background: #fff3cd;
  color: #f57c00;
}

.status-queued {
  background: #e3f2fd;
  color: #1976d2;
}

.status-cancelled {
  background: #f5f5f5;
  color: #757575;
}

.detail-title-text {
  font-size: 20px;
  font-weight: bold;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.detail-meta {
  color: #666;
  font-size: 14px;
  margin-bottom: 16px;
}

.repo-link {
  color: #6750a4;
  text-decoration: none;
}

.repo-link:hover {
  text-decoration: underline;
}

.detail-body {
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  margin-bottom: 16px;
}

.detail-body :deep(pre) {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}

.detail-body :deep(code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.workflow-info {
  background: #f9f9f9;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
}

.workflow-info div {
  margin-bottom: 6px;
}

.view-link {
  color: #6750a4;
  text-decoration: none;
  display: block;
  margin-top: 12px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.action-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.state-open {
  background: #ffebee;
  color: #c62828;
}

.action-btn.state-closed {
  background: #e8f5e8;
  color: #2e7d32;
}

.action-btn.merge {
  background: #6750a4;
  color: white;
}

.action-btn.run-again {
  background: #4caf50;
  color: white;
}

.comments-section {
  margin-top: 24px;
}

.comments-section h3 {
  margin-bottom: 16px;
  font-size: 16px;
  color: #333;
}

.comment-fab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #6750a4;
  color: white;
  border: none;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(103, 80, 164, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
  z-index: 250;
}

.comment-fab:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(103, 80, 164, 0.4);
}

/* Merge Modal */
.merge-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.merge-modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
}

.merge-modal h3 {
  margin: 0 0 16px 0;
}

.merge-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.merge-options button {
  padding: 12px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.merge-options button:hover {
  background: #f5f5f5;
}

.cancel-btn {
  width: 100%;
  padding: 12px;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease-in-out;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(100%);
}

/* Assignee Section */
.assignee-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.assignee-section:hover {
  background: #eeeeee;
}

.assignee-label {
  font-weight: 500;
  color: #666;
  flex-shrink: 0;
}

.assignee-list {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.assignee-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #6750a4;
  color: white;
  border-radius: 16px;
  font-size: 13px;
}

.assignee-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.no-assignee {
  color: #999;
  font-style: italic;
}

.edit-icon {
  color: #666;
  font-size: 16px;
}

/* Assignee Modal */
.assignee-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.assignee-modal {
  background: white;
  border-radius: 12px;
  padding: 16px;
  max-width: 300px;
  width: 85%;
  max-height: 60vh;
  overflow-y: auto;
}

.assignee-modal h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.assignee-input-container {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.assignee-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
}

.assignee-input:focus {
  outline: none;
  border-color: #6750a4;
}

.add-assignee-btn {
  padding: 8px 12px;
  background: #6750a4;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.add-assignee-btn:hover {
  background: #5a4490;
}

.current-assignees {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
  min-height: 28px;
}

.selected-assignee {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #e8e0f0;
  border-radius: 12px;
  font-size: 12px;
}

.remove-assignee-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  line-height: 1;
}

.remove-assignee-btn:hover {
  color: #c62828;
}

.assignee-suggestions {
  margin-bottom: 12px;
}

.suggestions-label {
  font-size: 11px;
  color: #666;
  margin-bottom: 6px;
}

.suggestion-item {
  padding: 8px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
}

.suggestion-item:hover {
  background: #f5f5f5;
}

.assignee-modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.save-btn {
  padding: 8px 16px;
  background: #6750a4;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.save-btn:hover:not(:disabled) {
  background: #5a4490;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Project Items */
.project-items-loading {
  text-align: center;
  padding: 24px;
  color: #666;
}

.project-items-section {
  margin-top: 16px;
}

.project-status-group {
  margin-bottom: 16px;
}

.status-group-header {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px 0;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
}

.status-group-header:hover {
  background: #ececec;
}

.status-group-label {
  text-transform: capitalize;
}

.status-group-count {
  font-weight: 400;
  color: #999;
  flex: 1;
}

.group-chevron {
  font-size: 18px;
  line-height: 1;
  color: #999;
  transition: transform 0.2s;
  transform: rotate(90deg);
}

.group-chevron.is-collapsed {
  transform: rotate(0deg);
}

.project-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 6px;
}

.project-item:hover {
  background: #f9f9f9;
}

.project-item:last-child {
  border-bottom: none;
}

.project-item-state {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.state-open-dot {
  background: #2e7d32;
}

.state-closed-dot {
  background: #7b1fa2;
}

.state-draft-dot {
  background: #999;
}

.project-item-title {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-item-number {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

/* Project Item Detail Modal */
.project-item-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 300;
}

.project-item-modal {
  background: white;
  border-radius: 16px 16px 0 0;
  padding: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 60vh;
  overflow-y: auto;
}

.project-item-modal-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.project-item-modal-header h3 {
  flex: 1;
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}

.close-modal-btn:hover {
  color: #333;
}

.project-item-detail-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.project-item-detail-row:last-of-type {
  border-bottom: none;
}

.detail-label {
  font-size: 12px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  width: 90px;
  flex-shrink: 0;
}

.detail-value {
  font-size: 14px;
  color: #333;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .detail-screen {
    background: #121212;
  }

  .detail-card {
    background: #2d2d2d;
    border-color: #404040;
  }

  .detail-title-text {
    color: #e0e0e0;
  }

  .detail-meta {
    color: #aaa;
  }

  .detail-body {
    color: #e0e0e0;
  }

  .detail-body :deep(pre) {
    background: #1e1e1e;
  }

  .detail-body :deep(code) {
    background: #333;
    color: #e0e0e0;
  }

  .workflow-info {
    background: #252525;
    color: #e0e0e0;
  }

  .comments-section h3 {
    color: #e0e0e0;
  }

  .merge-modal {
    background: #1e1e1e;
    color: #e0e0e0;
  }

  .merge-options button {
    background: #2d2d2d;
    border-color: #404040;
    color: #e0e0e0;
  }

  .merge-options button:hover {
    background: #333;
  }

  .cancel-btn {
    background: #333;
    color: #e0e0e0;
  }

  .comment-fab {
    background: #7a5fb2;
  }

  .assignee-section {
    background: #252525;
  }

  .assignee-section:hover {
    background: #333;
  }

  .assignee-label {
    color: #aaa;
  }

  .no-assignee {
    color: #777;
  }

  .edit-icon {
    color: #aaa;
  }

  .assignee-modal {
    background: #1e1e1e;
    color: #e0e0e0;
  }

  .assignee-input {
    background: #2d2d2d;
    border-color: #404040;
    color: #e0e0e0;
  }

  .assignee-input:focus {
    border-color: #7a5fb2;
  }

  .add-assignee-btn {
    background: #7a5fb2;
  }

  .selected-assignee {
    background: #3d3d3d;
  }

  .remove-assignee-btn {
    color: #aaa;
  }

  .suggestion-item {
    border-color: #404040;
  }

  .suggestion-item:hover {
    background: #333;
  }

  .save-btn {
    background: #7a5fb2;
  }

  .project-items-loading {
    color: #aaa;
  }

  .project-item {
    border-bottom-color: #333;
  }

  .project-item-title {
    color: #e0e0e0;
  }

  .project-item-number {
    color: #777;
  }

  .state-draft-dot {
    background: #666;
  }

  .status-group-header {
    background: #252525;
    color: #e0e0e0;
  }

  .status-group-header:hover {
    background: #2e2e2e;
  }

  .project-item:hover {
    background: #333;
  }

  .project-item-modal {
    background: #1e1e1e;
    color: #e0e0e0;
  }

  .project-item-detail-row {
    border-bottom-color: #333;
  }

  .detail-value {
    color: #e0e0e0;
  }

  .close-modal-btn {
    color: #aaa;
  }

  .close-modal-btn:hover {
    color: #e0e0e0;
  }
}
</style>
