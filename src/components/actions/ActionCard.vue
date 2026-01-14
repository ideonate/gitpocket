<template>
  <div class="action-card" @click="$emit('click')">
    <div class="card-header">
      <span class="action-repo">{{ repoName }}</span>
      <span class="status-badge" :class="statusClass">
        {{ run.conclusion || run.status }}
      </span>
    </div>
    <div class="workflow-name">{{ run.name }}</div>
    <div class="card-title">{{ run.head_commit?.message || run.display_title || 'No message' }}</div>
    <div class="card-footer">
      <span>{{ run.head_branch }}</span>
      <span>{{ formatDate(run.created_at) }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  run: {
    type: Object,
    required: true
  }
});

defineEmits(['click']);

const repoName = computed(() => {
  if (props.run.repository_name) {
    return props.run.repository_name.split('/')[1];
  }
  return '';
});

const statusClass = computed(() => {
  const conclusion = props.run.conclusion || props.run.status;
  switch (conclusion) {
    case 'success': return 'status-success';
    case 'failure': return 'status-failure';
    case 'in_progress': return 'status-in-progress';
    case 'queued': return 'status-queued';
    case 'cancelled': return 'status-cancelled';
    default: return '';
  }
});

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
.action-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
}

.action-card:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.action-repo {
  display: inline-block;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  color: #666;
}

.workflow-name {
  color: #999;
  font-size: 12px;
  margin-bottom: 4px;
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

.status-success {
  background: #e8f5e8;
  color: #2e7d32;
}

.status-failure {
  background: #ffebee;
  color: #c62828;
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

.card-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  line-height: 1.3;
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
  .action-card {
    background: #2d2d2d;
    border-color: #404040;
    color: #e0e0e0;
  }

  .action-repo {
    background: #3a3a3a;
    color: #aaa;
  }

  .workflow-name,
  .card-footer {
    color: #888;
  }
}
</style>
