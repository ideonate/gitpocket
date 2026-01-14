<template>
  <div class="comment-modal-overlay" @click.self="$emit('close')">
    <div class="comment-modal">
      <div class="comment-modal-header">
        <h3>Add a Comment</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="comment-modal-body">
        <textarea
          v-model="commentText"
          class="comment-textarea"
          placeholder="Type your comment here...&#10;&#10;You can use multiple lines and Markdown formatting."
          :disabled="submitting"
        ></textarea>
      </div>
      <div class="comment-modal-footer">
        <button class="cancel-btn" @click="$emit('close')">Cancel</button>
        <button
          class="send-btn"
          :disabled="!commentText.trim() || submitting"
          @click="submitComment"
        >
          {{ submitting ? 'Sending...' : 'Send' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useGitHub } from '../../composables/useGitHub';
import { useAppStore } from '../../stores/app';

const props = defineProps({
  owner: {
    type: String,
    required: true
  },
  repo: {
    type: String,
    required: true
  },
  number: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['close', 'submitted']);

const { addComment } = useGitHub();
const appStore = useAppStore();

const commentText = ref('');
const submitting = ref(false);

async function submitComment() {
  if (!commentText.value.trim() || submitting.value) return;

  submitting.value = true;
  try {
    await addComment(props.owner, props.repo, props.number, commentText.value);
    commentText.value = '';
    emit('submitted');
  } catch (error) {
    appStore.showError('Failed to add comment: ' + error.message);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.comment-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 20px;
}

.comment-modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.comment-modal-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f5f5f5;
}

.comment-modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.comment-textarea {
  width: 100%;
  min-height: 150px;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  color: #333;
  background: white;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.comment-textarea:focus {
  border-color: #6750a4;
}

.comment-modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  background: #f5f5f5;
  color: #666;
  transition: background 0.2s;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.send-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  background: #6750a4;
  color: white;
  transition: background 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #5a4594;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (prefers-color-scheme: dark) {
  .comment-modal {
    background: #1e1e1e;
  }

  .comment-modal-header {
    border-bottom-color: #404040;
  }

  .comment-modal-header h3 {
    color: #e0e0e0;
  }

  .close-btn {
    color: #999;
  }

  .close-btn:hover {
    background: #2d2d2d;
  }

  .comment-textarea {
    background: #2d2d2d;
    border-color: #404040;
    color: #e0e0e0;
  }

  .comment-textarea:focus {
    border-color: #7a5fb2;
  }

  .comment-modal-footer {
    border-top-color: #404040;
  }

  .cancel-btn {
    background: #2d2d2d;
    color: #999;
  }

  .cancel-btn:hover {
    background: #404040;
  }

  .send-btn {
    background: #7a5fb2;
  }

  .send-btn:hover:not(:disabled) {
    background: #6750a4;
  }
}
</style>
