<template>
  <div class="tab-bar">
    <button
      class="tab"
      :class="{ active: appStore.currentTab === 0 }"
      @click="appStore.setTab(0)"
    >
      <div class="tab-icon">🐛</div>
      <div class="tab-text">Issues ({{ appStore.filteredIssues.length }})</div>
    </button>
    <button
      class="tab"
      :class="{ active: appStore.currentTab === 1 }"
      @click="appStore.setTab(1)"
    >
      <div class="tab-icon">🔄</div>
      <div class="tab-text">Pull Requests ({{ appStore.filteredPullRequests.length }})</div>
    </button>
    <button
      class="tab"
      :class="{ active: appStore.currentTab === 2 }"
      @click="appStore.setTab(2)"
    >
      <div class="tab-icon">⚡</div>
      <div class="tab-text">Actions ({{ appStore.filteredWorkflowRuns.length }})</div>
    </button>
  </div>
</template>

<script setup>
import { useAppStore } from '../../stores/app';

const appStore = useAppStore();
</script>

<style scoped>
.tab-bar {
  height: 48px;
  background: white;
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  z-index: 50;
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  background: none;
  border: none;
  color: #666;
}

.tab.active {
  color: #6750a4;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #6750a4;
}

.tab-icon {
  font-size: 18px;
}

.tab-text {
  font-size: 12px;
  font-weight: 500;
  margin-top: 2px;
}

@media (prefers-color-scheme: dark) {
  .tab-bar {
    background: #1e1e1e;
    border-bottom-color: #333;
  }

  .tab {
    color: #aaa;
  }

  .tab.active {
    color: #9c88d9;
  }

  .tab.active::after {
    background: #9c88d9;
  }
}
</style>
