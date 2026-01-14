<template>
  <div class="filter-panel">
    <div class="filter-panel-header">
      <span>Select Repository</span>
      <button class="filter-panel-close" @click="appStore.toggleFilterPanel()">✕</button>
    </div>
    <div class="filter-panel-content">
      <!-- All repositories option -->
      <button
        class="filter-option-all"
        :class="{ selected: !appStore.currentFilter }"
        @click="selectFilter(null)"
      >
        All repositories
      </button>

      <!-- Repository groups by organization -->
      <div v-for="group in groupedRepos" :key="group.name" class="repo-group">
        <button
          class="repo-group-header"
          @click="toggleGroup(group.name)"
        >
          <span class="repo-group-arrow" :class="{ collapsed: isCollapsed(group.name) }">▼</span>
          <span>{{ group.name }}</span>
          <span class="repo-group-count">{{ group.repos.length }}</span>
        </button>
        <div class="repo-group-items" :class="{ collapsed: isCollapsed(group.name) }">
          <!-- Select entire org -->
          <button
            class="repo-item"
            :class="{ selected: appStore.currentFilter === group.name }"
            @click="selectFilter(group.name)"
          >
            📁 All {{ group.name }} repos
          </button>
          <!-- Individual repos -->
          <button
            v-for="repo in group.repos"
            :key="repo.full_name"
            class="repo-item"
            :class="{ selected: appStore.currentFilter === repo.full_name }"
            @click="selectFilter(repo.full_name)"
          >
            <span class="repo-icon">{{ repo.private ? '🔒' : '📂' }}</span>
            {{ repo.name }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAppStore } from '../../stores/app';

const appStore = useAppStore();

const groupedRepos = computed(() => {
  const groups = {};

  appStore.allRepositories.forEach(repo => {
    const owner = repo.owner.login;
    if (!groups[owner]) {
      groups[owner] = {
        name: owner,
        repos: []
      };
    }
    groups[owner].repos.push(repo);
  });

  return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
});

function isCollapsed(groupName) {
  return appStore.collapsedGroups.has(groupName);
}

function toggleGroup(groupName) {
  appStore.toggleGroup(groupName);
}

function selectFilter(filter) {
  appStore.setFilter(filter);
}
</script>

<style scoped>
.filter-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 200;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.filter-panel-header {
  padding: 12px 16px;
  background: #f5f5f5;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}

.filter-panel-close {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: #666;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: background 0.2s;
}

.filter-panel-close:hover {
  background: rgba(0,0,0,0.1);
}

.filter-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.filter-option-all {
  padding: 10px 16px;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 4px;
}

.filter-option-all:hover {
  background: #f5f5f5;
}

.filter-option-all.selected {
  background: #e8f4fd;
  color: #1976d2;
}

.repo-group {
  margin-bottom: 4px;
}

.repo-group-header {
  padding: 8px 16px;
  background: #f9f9f9;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.repo-group-header:hover {
  background: #f0f0f0;
}

.repo-group-arrow {
  font-size: 10px;
  transition: transform 0.2s;
}

.repo-group-arrow.collapsed {
  transform: rotate(-90deg);
}

.repo-group-count {
  margin-left: auto;
  font-size: 12px;
  color: #666;
  font-weight: normal;
}

.repo-group-items {
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  transition: max-height 0.3s ease;
}

.repo-group-items.collapsed {
  max-height: 0;
  overflow: hidden;
}

.repo-item {
  padding: 8px 16px 8px 40px;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.repo-item:hover {
  background: #f5f5f5;
}

.repo-item.selected {
  background: #e8f4fd;
  color: #1976d2;
}

.repo-icon {
  font-size: 12px;
}

@media (prefers-color-scheme: dark) {
  .filter-panel {
    background: #1e1e1e;
  }

  .filter-panel-header {
    background: #2a2a2a;
    color: #e0e0e0;
    border-bottom-color: #333;
  }

  .filter-panel-close {
    color: #aaa;
  }

  .filter-option-all {
    border-bottom-color: #333;
    color: #e0e0e0;
  }

  .filter-option-all:hover,
  .repo-group-header:hover,
  .repo-item:hover {
    background: #333;
  }

  .filter-option-all.selected,
  .repo-item.selected {
    background: #2a3f5f;
    color: #64b5f6;
  }

  .repo-group-header {
    background: #252525;
    color: #e0e0e0;
  }

  .repo-group-count {
    color: #aaa;
  }

  .repo-item {
    color: #e0e0e0;
  }
}
</style>
