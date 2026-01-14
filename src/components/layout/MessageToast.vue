<template>
  <Transition name="toast">
    <div
      v-if="appStore.message.visible"
      class="message-toast"
      :class="appStore.message.type"
    >
      {{ appStore.message.text }}
    </div>
  </Transition>
</template>

<script setup>
import { useAppStore } from '../../stores/app';

const appStore = useAppStore();
</script>

<style scoped>
.message-toast {
  position: fixed;
  top: 70px;
  left: 16px;
  right: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  z-index: 300;
  text-align: center;
  font-size: 14px;
}

.message-toast.success {
  background: #e8f5e8;
  color: #2e7d32;
  border: 1px solid #c8e6c8;
}

.message-toast.error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
}

.toast-enter-active,
.toast-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.toast-enter-from {
  transform: translateY(-150px);
  opacity: 0;
}

.toast-leave-to {
  transform: translateY(-150px);
  opacity: 0;
}
</style>
