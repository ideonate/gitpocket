<template>
  <div class="actions-list">
    <div v-if="appStore.loading" class="loading-state">
      <div class="spinner"></div>
      <div>Loading...</div>
    </div>

    <div v-else-if="workflowRuns.length === 0" class="empty-state">
      <div class="empty-icon">⚡</div>
      <div>No workflow runs found</div>
    </div>

    <div v-else>
      <ActionCard
        v-for="run in workflowRuns"
        :key="run.id"
        :run="run"
        @click="openDetail(run)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAppStore } from '../../stores/app';
import ActionCard from './ActionCard.vue';

const appStore = useAppStore();

const workflowRuns = computed(() => appStore.filteredWorkflowRuns);

function openDetail(run) {
  appStore.setCurrentItem(run, 'action');
}
</script>

<style scoped>
.actions-list {
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

@media (prefers-color-scheme: dark) {
  .empty-state {
    color: #aaa;
  }
}
</style>
