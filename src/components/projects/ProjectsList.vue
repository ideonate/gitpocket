<template>
  <div class="projects-list">
    <div v-if="appStore.loading" class="loading-state">
      <div class="spinner"></div>
      <div>Loading...</div>
    </div>

    <div v-else-if="!hasProjectsToken" class="empty-state">
      <div class="empty-icon">🔑</div>
      <div class="empty-title">Projects token required</div>
      <div class="empty-hint">
        Add a classic token with <strong>read:project</strong> scope in Token Management to access GitHub Projects V2.
      </div>
    </div>

    <div v-else-if="projects.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <div>No projects found</div>
    </div>

    <div v-else>
      <ProjectCard
        v-for="project in projects"
        :key="project.id"
        :project="project"
        @click="openDetail(project)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAppStore } from '../../stores/app';
import { useAuthStore } from '../../stores/auth';
import ProjectCard from './ProjectCard.vue';

const appStore = useAppStore();
const authStore = useAuthStore();

const projects = computed(() => appStore.filteredProjects);
const hasProjectsToken = computed(() => !!authStore.projectsToken);

function openDetail(project) {
  appStore.setCurrentItem(project, 'project');
}
</script>

<style scoped>
.projects-list {
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

.empty-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  line-height: 1.5;
  max-width: 280px;
  margin: 0 auto;
}

@media (prefers-color-scheme: dark) {
  .empty-state {
    color: #aaa;
  }
}
</style>
