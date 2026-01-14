<template>
  <div class="prs-list">
    <div v-if="appStore.loading" class="loading-state">
      <div class="spinner"></div>
      <div>Loading...</div>
    </div>

    <div v-else-if="pullRequests.length === 0" class="empty-state">
      <div class="empty-icon">🔄</div>
      <div>No pull requests found</div>
    </div>

    <div v-else>
      <PRCard
        v-for="pr in pullRequests"
        :key="pr.id"
        :pr="pr"
        @click="openDetail(pr)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAppStore } from '../../stores/app';
import PRCard from './PRCard.vue';

const appStore = useAppStore();

const pullRequests = computed(() => appStore.filteredPullRequests);

function openDetail(pr) {
  appStore.setCurrentItem(pr, 'pr');
}
</script>

<style scoped>
.prs-list {
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
