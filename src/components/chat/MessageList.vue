<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useSharedChat } from '@/composables/shared'
import type { ChatMessage } from '@/types'
import MessageItem from './MessageItem.vue'

const {
  activeMessages,
  streaming,
  send,
  createConversation,
  retryLast
} = useSharedChat()

const scrollRef = ref<HTMLDivElement | null>(null)

function scrollToBottom(behavior: ScrollBehavior = 'auto') {
  nextTick(() => {
    const el = scrollRef.value
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  })
}

// 流式输出时持续滚到底部
watch(
  () => activeMessages.value.reduce((s: number, m: ChatMessage) => s + m.content.length, 0),
  () => scrollToBottom('smooth')
)

watch(
  () => activeMessages.value.length,
  () => scrollToBottom('smooth')
)

onMounted(() => scrollToBottom())

// 空状态引导
const examples = [
  '公司年假政策是怎样的？',
  '差旅报销标准是什么？',
  '新员工入职流程有哪些？',
  '代码合并需要几人 approve？'
]

function startNewConversation(q: string) {
  if (streaming.value) return
  createConversation()
  void send(q)
}
</script>

<template>
  <div ref="scrollRef" class="msg-list">
    <div class="msg-inner">
      <div v-if="activeMessages.length === 0" class="empty-hero">
        <div class="hero-icon">
          <svg viewBox="0 0 64 64" width="56" height="56" fill="none">
            <defs>
              <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#4f7cff" />
                <stop offset="1" stop-color="#7b3cff" />
              </linearGradient>
            </defs>
            <rect x="6" y="6" width="52" height="52" rx="14" fill="url(#hg)" opacity="0.12" />
            <path
              d="M16 36c4-8 12-12 16-12s12 4 16 12"
              stroke="url(#hg)"
              stroke-width="3"
              fill="none"
              stroke-linecap="round"
            />
            <circle cx="32" cy="22" r="6" fill="url(#hg)" />
            <path
              d="M22 44h20 M24 50h16"
              stroke="url(#hg)"
              stroke-width="2.5"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <h1 class="hero-title">KnowStream AI · 私有文档问答</h1>
        <p class="hero-sub">基于知识库检索 + 大模型流式生成，所有数据驻留企业内部</p>
        <div class="hero-examples">
          <button
            v-for="(q, i) in examples"
            :key="i"
            class="example-chip"
            @click="startNewConversation(q)"
          >
            {{ q }}
          </button>
        </div>
      </div>

      <MessageItem
        v-for="msg in activeMessages"
        :key="msg.id"
        :message="msg"
        @retry="retryLast"
      />
    </div>
  </div>
</template>

<style scoped>
.msg-list {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 24px 0;
}

.msg-inner {
  max-width: 880px;
  margin: 0 auto;
  padding: 0 24px 24px;
}

.empty-hero {
  text-align: center;
  padding: 56px 24px 24px;
}

.hero-icon {
  display: inline-flex;
  margin-bottom: 16px;
}

.hero-title {
  font-size: 24px;
  font-weight: 600;
  background: var(--grad-primary);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
}

.hero-sub {
  font-size: 14px;
  color: var(--color-text-3);
  margin-bottom: 28px;
}

.hero-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  max-width: 640px;
  margin: 0 auto;
}

.example-chip {
  padding: 8px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: 13px;
  color: var(--color-text-2);
  transition: all 0.18s ease;
}

.example-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(79, 124, 255, 0.04);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}
</style>
