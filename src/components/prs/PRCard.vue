<template>
  <div class="pr-card" @click="$emit('click')">
    <div class="card-header">
      <span class="pr-number">#{{ pr.number }} · {{ repoName }}</span>
      <div class="badges">
        <span class="status-badge" :class="statusClass">
          {{ pr.state }}
        </span>
        <span v-if="pr.draft" class="status-badge status-draft">Draft</span>
      </div>
    </div>
    <div class="card-title">{{ pr.title }}</div>
    <div v-if="pr.body" class="card-body">
      {{ truncateBody(pr.body) }}
    </div>
    <div class="card-footer">
      <span>{{ pr.user?.login }}</span>
      <span>{{ formatDate(pr.updated_at) }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  pr: {
    type: Object,
    required: true
  }
});

defineEmits(['click']);

const repoName = computed(() => {
  if (props.pr.repository_name) {
    return props.pr.repository_name.split('/')[1];
  }
  return '';
});

const statusClass = computed(() => {
  return props.pr.state === 'open' ? 'status-open' : 'status-closed';
});

function truncateBody(body) {
  if (!body) return '';
  const cleaned = body.replace(/\r?\n/g, ' ').trim();
  return cleaned.length > 100 ? cleaned.substring(0, 100) + '...' : cleaned;
}

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
.pr-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
}

.pr-card:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.pr-number {
  color: #6750a4;
  font-weight: 500;
  font-size: 14px;
}

.badges {
  display: flex;
  gap: 6px;
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

.status-draft {
  background: #f3e5f5;
  color: #7b1fa2;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 6px;
  line-height: 1.3;
}

.card-body {
  color: #666;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 12px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #999;
}

@media (prefers-color-scheme: dark) {
  .pr-card {
    background: #2d2d2d;
    border-color: #404040;
    color: #e0e0e0;
  }

  .card-body {
    color: #aaa;
  }

  .pr-number {
    color: #9c88d9;
  }

  .card-footer {
    color: #888;
  }
}
</style>
