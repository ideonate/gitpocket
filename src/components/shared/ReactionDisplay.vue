<template>
  <div class="reactions-container">
    <div class="reactions-list">
      <button
        v-for="(count, emoji) in reactionCounts"
        :key="emoji"
        class="reaction-badge"
        :class="{ 'user-reacted': userReacted(emoji) }"
        @click="toggleReaction(emoji)"
      >
        <span>{{ emojiMap[emoji] }}</span>
        <span>{{ count }}</span>
      </button>

      <button class="reaction-add-btn" @click="showPicker = true" title="Add reaction">
        +
      </button>
    </div>

    <!-- Reaction Picker -->
    <div v-if="showPicker" class="reaction-picker-overlay" @click.self="showPicker = false">
      <div class="reaction-picker">
        <button
          v-for="(emoji, key) in emojiMap"
          :key="key"
          @click="addNewReaction(key)"
        >
          {{ emoji }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useGitHub } from '../../composables/useGitHub';
import { useAuthStore } from '../../stores/auth';
import { useAppStore } from '../../stores/app';

const props = defineProps({
  reactions: {
    type: Array,
    default: () => []
  },
  itemId: {
    type: [Number, String],
    required: true
  },
  owner: {
    type: String,
    required: true
  },
  repo: {
    type: String,
    required: true
  },
  isComment: {
    type: Boolean,
    default: false
  }
});

const { addReaction, removeReaction } = useGitHub();
const authStore = useAuthStore();
const appStore = useAppStore();

const showPicker = ref(false);

const emojiMap = {
  '+1': '👍',
  '-1': '👎',
  'laugh': '😄',
  'hooray': '🎉',
  'confused': '😕',
  'heart': '❤️',
  'rocket': '🚀',
  'eyes': '👀'
};

const reactionCounts = computed(() => {
  const counts = {};
  props.reactions.forEach(r => {
    const content = r.content;
    if (content) {
      counts[content] = (counts[content] || 0) + 1;
    }
  });
  return counts;
});

function userReacted(emoji) {
  const username = authStore.user?.login;
  return props.reactions.some(r => r.content === emoji && r.user?.login === username);
}

async function toggleReaction(emoji) {
  const username = authStore.user?.login;
  const existingReaction = props.reactions.find(r =>
    r.content === emoji && r.user?.login === username
  );

  try {
    if (existingReaction) {
      await removeReaction(props.owner, props.repo, existingReaction.id);
      // Remove from local state
      const index = props.reactions.findIndex(r => r.id === existingReaction.id);
      if (index > -1) {
        props.reactions.splice(index, 1);
      }
    } else {
      const newReaction = await addReaction(
        props.owner,
        props.repo,
        props.itemId,
        emoji,
        props.isComment
      );
      props.reactions.push(newReaction);
    }
  } catch (error) {
    appStore.showError('Failed to update reaction: ' + error.message);
  }
}

async function addNewReaction(emoji) {
  showPicker.value = false;
  await toggleReaction(emoji);
}
</script>

<style scoped>
.reactions-container {
  margin-top: 8px;
  min-height: 32px;
}

.reactions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.reaction-badge {
  padding: 4px 8px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 12px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.reaction-badge:hover {
  background: #e8e8e8;
  transform: scale(1.05);
}

.reaction-badge.user-reacted {
  background: #6750a4;
  color: white;
  border-color: #6750a4;
}

.reaction-add-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f0f0f0;
  border: 1px dashed #999;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.reaction-add-btn:hover {
  background: #e0e0e0;
  transform: scale(1.1);
}

.reaction-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.reaction-picker {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.reaction-picker button {
  width: 40px;
  height: 40px;
  font-size: 20px;
  border: none;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.reaction-picker button:hover {
  background: #6750a4;
  transform: scale(1.2);
}

@media (prefers-color-scheme: dark) {
  .reaction-badge {
    background: #3a3a3a;
    border-color: #555;
    color: #e0e0e0;
  }

  .reaction-badge:hover {
    background: #4a4a4a;
  }

  .reaction-badge.user-reacted {
    background: #7a5fb2;
    border-color: #7a5fb2;
  }

  .reaction-add-btn {
    background: #3a3a3a;
    border-color: #666;
    color: #999;
  }

  .reaction-add-btn:hover {
    background: #4a4a4a;
  }

  .reaction-picker {
    background: #2a2a2a;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }

  .reaction-picker button {
    background: #3a3a3a;
  }

  .reaction-picker button:hover {
    background: #7a5fb2;
  }
}
</style>
