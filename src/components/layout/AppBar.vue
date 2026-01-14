<template>
  <div class="app-bar">
    <div class="app-bar-main">
      <div class="app-title">GitPocket</div>
      <div class="app-actions">
        <button class="icon-btn" @click="$emit('refresh')" title="Refresh">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
        <button class="icon-btn" @click="$emit('show-profile')" title="Profile">
          👤
        </button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <button class="filter-toggle-btn" @click="appStore.toggleFilterPanel()">
        <span class="filter-label">Filter: <span>{{ filterLabel }}</span></span>
        <span class="filter-arrow" :class="{ open: appStore.filterPanelOpen }">▼</span>
      </button>
      <button
        v-if="appStore.currentFilter"
        class="filter-clear"
        @click="appStore.clearFilter()"
      >
        Clear
      </button>
      <button
        class="state-cycle-btn"
        :data-state="appStore.stateFilter"
        @click="appStore.cycleStateFilter()"
      >
        {{ stateLabel }}
      </button>
    </div>

    <!-- Filter Panel -->
    <FilterPanel v-if="appStore.filterPanelOpen" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAppStore } from '../../stores/app';
import FilterPanel from './FilterPanel.vue';

const emit = defineEmits(['refresh', 'show-profile']);

const appStore = useAppStore();

const filterLabel = computed(() => {
  if (!appStore.currentFilter) return 'All repositories';
  if (appStore.currentFilter === '__private__') return 'Private repos';
  if (appStore.currentFilter === '__public__') return 'Public repos';
  return appStore.currentFilter;
});

const stateLabel = computed(() => {
  switch (appStore.stateFilter) {
    case 'open': return 'Open';
    case 'closed': return 'Closed';
    default: return 'All';
  }
});
</script>

<style scoped>
.app-bar {
  height: auto;
  min-height: 56px;
  background: #6750a4;
  color: white;
  display: flex;
  flex-direction: column;
  padding: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 100;
  flex-shrink: 0;
  position: relative;
}

.app-bar-main {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  justify-content: space-between;
}

.app-title {
  font-size: 20px;
  font-weight: 500;
}

.app-actions {
  display: flex;
  gap: 8px;
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
  font-size: 20px;
  transition: background 0.2s;
}

.icon-btn:hover {
  background: rgba(255,255,255,0.1);
}

.filter-bar {
  background: rgba(255,255,255,0.1);
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.filter-toggle-btn {
  flex: 1;
  padding: 8px 12px;
  background: white;
  color: #333;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  transition: background 0.2s;
}

.filter-toggle-btn:hover {
  background: #f5f5f5;
}

.filter-arrow {
  transition: transform 0.2s;
  font-size: 12px;
}

.filter-arrow.open {
  transform: rotate(180deg);
}

.filter-clear {
  padding: 6px 12px;
  background: rgba(255,255,255,0.2);
  color: white;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.filter-clear:hover {
  background: rgba(255,255,255,0.3);
}

.state-cycle-btn {
  padding: 8px 16px;
  background: white;
  color: #333;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  margin-left: auto;
  font-weight: 500;
  min-width: 80px;
  text-align: center;
}

.state-cycle-btn:hover {
  background: #f0f0f0;
}

.state-cycle-btn[data-state="open"] {
  background: #e8f5e9;
  color: #2e7d32;
}

.state-cycle-btn[data-state="closed"] {
  background: #ffebee;
  color: #c62828;
}

.state-cycle-btn[data-state="all"] {
  background: white;
  color: #333;
}
</style>
