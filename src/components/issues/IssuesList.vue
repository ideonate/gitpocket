<template>
  <div class="issues-list">
    <div v-if="appStore.loading" class="loading-state">
      <div class="spinner"></div>
      <div>Loading...</div>
    </div>

    <div v-else-if="issues.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <div>No issues found</div>
    </div>

    <div v-else>
      <IssueCard
        v-for="issue in issues"
        :key="issue.id"
        :issue="issue"
        @click="openDetail(issue)"
      />
    </div>

    <!-- Floating New Issue button (only when filtered to specific repo) -->
    <button
      v-if="isSpecificRepoFilter"
      class="new-issue-fab"
      @click="showNewIssueModal = true"
      title="New Issue"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>

    <!-- New Issue Modal -->
    <NewIssueModal
      v-if="showNewIssueModal"
      :owner="filterOwner"
      :repo="filterRepo"
      @close="showNewIssueModal = false"
      @created="onIssueCreated"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useAppStore } from '../../stores/app';
import { useGitHub } from '../../composables/useGitHub';
import IssueCard from './IssueCard.vue';
import NewIssueModal from '../shared/NewIssueModal.vue';

const appStore = useAppStore();
const { refreshData } = useGitHub();

const showNewIssueModal = ref(false);

const issues = computed(() => appStore.filteredIssues);

// Check if the current filter is for a specific repo (contains '/')
const isSpecificRepoFilter = computed(() => {
  return appStore.currentFilter && appStore.currentFilter.includes('/');
});

// Extract owner and repo from the filter
const filterOwner = computed(() => {
  if (!isSpecificRepoFilter.value) return '';
  return appStore.currentFilter.split('/')[0];
});

const filterRepo = computed(() => {
  if (!isSpecificRepoFilter.value) return '';
  return appStore.currentFilter.split('/')[1];
});

function openDetail(issue) {
  appStore.setCurrentItem(issue, 'issue');
}

async function onIssueCreated(newIssue) {
  showNewIssueModal.value = false;
  appStore.showSuccess(`Issue #${newIssue.number} created!`);
  // Refresh data to include the new issue in the list
  await refreshData();
  // Open the newly created issue
  appStore.setCurrentItem(newIssue, 'issue');
}
</script>

<style scoped>
.issues-list {
  padding: 16px;
}

.loading-state {
  text-align: center;
  padding: 48px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #6750a4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 48px 32px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.new-issue-fab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #6750a4;
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(103, 80, 164, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.new-issue-fab:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(103, 80, 164, 0.4);
}

@media (prefers-color-scheme: dark) {
  .empty-state {
    color: #aaa;
  }

  .new-issue-fab {
    background: #7a5fb2;
  }
}
</style>
