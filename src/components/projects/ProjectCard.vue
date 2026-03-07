<template>
  <div class="project-card" @click="$emit('click')">
    <div class="card-header">
      <span class="project-owner">{{ project.owner_name }}</span>
      <span class="status-badge" :class="project.closed ? 'status-closed' : 'status-open'">
        {{ project.closed ? 'closed' : 'open' }}
      </span>
    </div>
    <div class="card-title">{{ project.title }}</div>
    <div v-if="project.shortDescription" class="card-description">{{ project.shortDescription }}</div>
    <div class="card-footer">
      <span>{{ project.items_count }} items</span>
      <span>{{ formatDate(project.updatedAt) }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  project: {
    type: Object,
    required: true
  }
});

defineEmits(['click']);

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const currentYear = now.getFullYear();
  const dateYear = date.getFullYear();

  const day = date.getDate();
  const month = date.toLocaleDateString('en', { month: 'short' });
  const year = dateYear !== currentYear ? String(dateYear).slice(-2) : '';
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const dateStr = year ? `${day} ${month} ${year}` : `${day} ${month}`;
  return `${dateStr} ${time}`;
}
</script>

<style scoped>
.project-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
}

.project-card:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.project-owner {
  display: inline-block;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  color: #666;
}

.status-badge {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
  gap: 4px;
}

.status-open {
  background: #e8f5e8;
  color: #2e7d32;
}

.status-closed {
  background: #ffebee;
  color: #c62828;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-description {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #999;
}

@media (prefers-color-scheme: dark) {
  .project-card {
    background: #2d2d2d;
    border-color: #404040;
    color: #e0e0e0;
  }

  .project-owner {
    background: #3a3a3a;
    color: #aaa;
  }

  .card-description {
    color: #888;
  }

  .card-footer {
    color: #888;
  }
}
</style>
