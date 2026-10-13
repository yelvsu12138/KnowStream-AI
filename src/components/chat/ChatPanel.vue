<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSharedChat } from '@/composables/shared'
import MessageList from '@/components/chat/MessageList.vue'
import MessageInput from '@/components/chat/MessageInput.vue'
import ReasoningPanel from '@/components/reasoning/ReasoningPanel.vue'

const { activeConversation, currentTrace, streaming, activeId, createConversation } =
  useSharedChat()

const showPanel = ref(true)

// 有 trace 时默认展开右侧面板
watch(currentTrace, (v) => {
  if (v) showPanel.value = true
})

function newConversation() {
  if (streaming.value) return
  createConversation()
}
</script>

<template>
  <div class="chat-panel">
    <div class="chat-main">
      <header class="chat-header">
        <div class="title-block">
          <h2>{{ activeConversation?.title ?? '智能问答' }}</h2>
          <span class="meta">
            {{ activeConversation?.messages.length ?? 0 }} 条消息
          </span>
        </div>
        <div class="actions">
          <button class="btn btn-ghost" :disabled="streaming" @click="newConversation">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            新对话
          </button>
          <button
            class="btn-icon panel-toggle"
            :class="{ active: showPanel }"
            title="切换推理面板"
            @click="showPanel = !showPanel"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path
                d="M3 12h18 M12 3v18"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
              <rect x="14" y="3" width="7" height="18" rx="1" fill="currentColor" opacity="0.18" />
            </svg>
          </button>
        </div>
      </header>

      <div v-if="!activeId" class="placeholder">
        <div class="placeholder-inner">
          <button class="btn btn-primary" @click="newConversation">开始新对话</button>
        </div>
      </div>

      <template v-else>
        <MessageList />
        <MessageInput />
      </template>
    </div>

    <Transition name="slide">
      <aside v-if="showPanel" class="reasoning-aside">
        <ReasoningPanel :trace="currentTrace" :floating="false" />
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  height: 100%;
  background: var(--color-bg);
}

.chat-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  height: var(--header-h);
  flex-shrink: 0;
}

.title-block {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.title-block h2 {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  font-size: 12px;
  color: var(--color-text-3);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-toggle.active {
  color: var(--color-primary);
  background: rgba(79, 124, 255, 0.08);
}

.placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-inner {
  text-align: center;
}

.reasoning-aside {
  width: 380px;
  flex-shrink: 0;
  border-left: 1px solid var(--color-border);
  background: var(--color-surface);
  overflow: hidden;
  height: 100%;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
  width: 0;
  opacity: 0;
}
</style>
