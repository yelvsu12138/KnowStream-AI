<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChatMessage } from '@/types'
import { renderMarkdown } from '@/utils/markdown'
import { formatTime, formatDuration, downloadText } from '@/utils/helpers'
import ReasoningTrigger from './ReasoningTrigger.vue'
import ReasoningPanel from '@/components/reasoning/ReasoningPanel.vue'

const props = defineProps<{
  message: ChatMessage
}>()

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const isUser = computed(() => props.message.role === 'user')
const rendered = computed(() =>
  isUser.value ? '' : renderMarkdown(props.message.content)
)

const showReasoning = ref(false)

function copyMessage() {
  navigator.clipboard?.writeText(props.message.content)
}

function exportMessage() {
  downloadText(`message_${props.message.id}.md`, props.message.content)
}
</script>

<template>
  <div class="msg" :class="{ user: isUser, ai: !isUser }">
    <div class="avatar">
      <span v-if="isUser">U</span>
      <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path
          d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4h-1M8 6a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0V6z M9 14a4 4 0 0 0 4 4h1a4 4 0 0 0 4-4"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
    <div class="body">
      <div class="meta">
        <span class="role">{{ isUser ? '我' : 'KnowStream' }}</span>
        <span class="time">{{ formatTime(props.message.createdAt) }}</span>
        <span v-if="props.message.tokenCount" class="extra">
          · {{ props.message.tokenCount }} tokens
        </span>
        <span v-if="props.message.elapsedMs" class="extra">
          · {{ formatDuration(props.message.elapsedMs) }}
        </span>
      </div>

      <div v-if="isUser" class="user-content">{{ props.message.content }}</div>
      <div v-else class="ai-content">
        <div
          v-if="props.message.content"
          class="markdown-body"
          v-html="rendered"
        />
        <div v-if="props.message.status === 'streaming' && !props.message.content" class="dot-typing">
          <span /><span /><span />
        </div>
        <span
          v-if="props.message.status === 'streaming' && props.message.content"
          class="stream-cursor"
        />
      </div>

      <div v-if="props.message.status === 'error'" class="error-box">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
          <path
            d="M12 9v4 M12 17h.01 M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0z"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>{{ props.message.error || '生成失败' }}</span>
        <button class="link-btn" @click="emit('retry')">重试</button>
      </div>

      <div v-if="props.message.status === 'aborted'" class="aborted-box">
        已中止生成
      </div>

      <div class="toolbar" v-if="!isUser && props.message.content && props.message.status === 'done'">
        <button class="tool-btn" @click="copyMessage">复制</button>
        <button class="tool-btn" @click="exportMessage">导出</button>
        <ReasoningTrigger
          v-if="props.message.reasoning"
          :trace="props.message.reasoning"
          v-model:open="showReasoning"
        />
      </div>

      <ReasoningPanel
        v-if="showReasoning && props.message.reasoning"
        :trace="props.message.reasoning"
        :floating="true"
      />
    </div>
  </div>
</template>

<style scoped>
.msg {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  animation: fade-in 0.3s ease both;
}

.avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.msg.user .avatar {
  background: linear-gradient(135deg, #6b7280, #4b5563);
}

.msg.ai .avatar {
  background: var(--grad-primary);
  color: #fff;
}

.body {
  flex: 1;
  min-width: 0;
}

.meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-text-3);
  margin-bottom: 4px;
}

.role {
  font-weight: 600;
  color: var(--color-text-2);
  font-size: 12px;
}

.extra {
  color: var(--color-text-muted);
}

.user-content {
  background: var(--color-primary);
  color: #fff;
  padding: 10px 14px;
  border-radius: 0 var(--radius) var(--radius) var(--radius);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  display: inline-block;
  max-width: 100%;
}

.ai-content {
  position: relative;
  color: var(--color-text);
  line-height: 1.7;
}

.stream-cursor {
  display: inline-block;
  width: 7px;
  height: 16px;
  margin-left: 2px;
  background: var(--color-primary);
  vertical-align: text-bottom;
  animation: blink 1s steps(2) infinite;
}

.error-box {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: var(--radius);
  background: rgba(239, 68, 68, 0.08);
  color: var(--color-error);
  font-size: 13px;
}

.link-btn {
  color: var(--color-error);
  text-decoration: underline;
  font-size: 12px;
}

.aborted-box {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-3);
  font-style: italic;
}

.toolbar {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.msg:hover .toolbar {
  opacity: 1;
}

.tool-btn {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--color-text-3);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

.tool-btn:hover {
  background: var(--color-bg-soft);
  color: var(--color-text);
}
</style>
