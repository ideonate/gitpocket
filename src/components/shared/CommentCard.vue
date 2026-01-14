<template>
  <div class="comment-card">
    <div class="comment-header">
      <span class="comment-author">{{ comment.user?.login }}</span>
      <span class="comment-date">{{ formatDate(comment.created_at) }}</span>
    </div>
    <div class="comment-body" v-html="formatBody(comment.body)"></div>

    <!-- Comment Reactions -->
    <ReactionDisplay
      v-if="comment.reactions?.length > 0"
      :reactions="comment.reactions"
      :item-id="comment.id"
      :owner="owner"
      :repo="repo"
      :is-comment="true"
    />
  </div>
</template>

<script setup>
import ReactionDisplay from './ReactionDisplay.vue';

const props = defineProps({
  comment: {
    type: Object,
    required: true
  },
  owner: {
    type: String,
    required: true
  },
  repo: {
    type: String,
    required: true
  }
});

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatBody(body) {
  if (!body) return '';
  return body
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}
</script>

<style scoped>
.comment-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  border-left: 3px solid #6750a4;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comment-author {
  font-weight: 500;
  font-size: 14px;
  color: #6750a4;
}

.comment-date {
  font-size: 12px;
  color: #999;
}

.comment-body {
  font-size: 14px;
  line-height: 1.4;
}

.comment-body :deep(pre) {
  background: #e9ecef;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.comment-body :deep(code) {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
}

@media (prefers-color-scheme: dark) {
  .comment-card {
    background: #2a2a2a;
  }

  .comment-author {
    color: #9c88d9;
  }

  .comment-body {
    color: #e0e0e0;
  }

  .comment-body :deep(pre),
  .comment-body :deep(code) {
    background: #1e1e1e;
    color: #e0e0e0;
  }
}
</style>
