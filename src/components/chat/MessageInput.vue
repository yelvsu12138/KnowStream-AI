<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useSharedChat } from '@/composables/shared'

const props = defineProps<{
  /** 知识库 ID（可选） */
  knowledgeBaseId?: string
}>()

const { streaming, send, abort } = useSharedChat()

const text = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const canSend = computed(() => text.value.trim().length > 0 && !streaming.value)

async function handleSend() {
  if (!canSend.value) return
  const t = text.value
  text.value = ''
  await nextTick()
  autoResize()
  await send(t)
}

function handleAbort() {
  abort()
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}

function onKeydown(e: KeyboardEvent) {
  // Enter 发送，Shift+Enter 换行
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    handleSend()
  }
}

watch(text, () => autoResize())

const charCount = computed(() => text.value.length)
</script>

<template>
  <div class="input-bar">
    <div class="input-wrap">
      <textarea
        ref="textareaRef"
        v-model="text"
        class="input-area"
        placeholder="输入你的问题，Enter 发送 · Shift+Enter 换行"
        rows="1"
        :disabled="streaming"
        @keydown="onKeydown"
      />
      <div class="input-actions">
        <span class="char-count">{{ charCount }}</span>
        <button
          v-if="!streaming"
          class="send-btn"
          :disabled="!canSend"
          @click="handleSend"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path
              d="M3 12l18-9-9 18-2-7-7-2z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>发送</span>
        </button>
        <button v-else class="stop-btn" @click="handleAbort">
          <span class="stop-icon" />
          <span>中止</span>
        </button>
      </div>
    </div>
    <div class="input-foot">
      <span class="kb-hint">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
          <path
            d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </svg>
        <span v-if="props.knowledgeBaseId">已挂载知识库</span>
        <span v-else>默认知识库</span>
      </span>
      <span class="powered">Powered by KnowStream · SSE 流式输出</span>
    </div>
  </div>
</template>

<style scoped>
.input-bar {
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  padding: 12px 20px 10px;
}

.input-wrap {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.input-wrap:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(79, 124, 255, 0.12);
}

.input-area {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  padding: 12px 16px 4px;
  font-size: 14px;
  line-height: 1.5;
  max-height: 200px;
  color: var(--color-text);
}

.input-area:disabled {
  color: var(--color-text-3);
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 10px 14px;
}

.char-count {
  font-size: 11px;
  color: var(--color-text-muted);
}

.send-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: var(--radius-pill);
  background: var(--grad-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.18s ease;
  box-shadow: var(--shadow-sm);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}

.send-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: var(--color-text-muted);
}

.stop-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-error);
  border: 1px solid var(--color-error);
  font-size: 13px;
  font-weight: 500;
}

.stop-btn:hover {
  background: rgba(239, 68, 68, 0.08);
}

.stop-icon {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: var(--color-error);
}

.input-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: var(--color-text-3);
}

.kb-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.powered {
  color: var(--color-text-muted);
}
</style>
