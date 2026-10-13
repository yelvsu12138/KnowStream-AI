<script setup lang="ts">
import { computed, ref, watchEffect, type ComputedRef } from 'vue'
import type { ReasoningTrace } from '@/types'
import { useVectorRetrieval } from '@/composables/useVectorRetrieval'
import { formatDuration } from '@/utils/helpers'
import StageTimeline from './StageTimeline.vue'
import RetrievalHits from './RetrievalHits.vue'
import VectorMatchViz from './VectorMatchViz.vue'

const props = defineProps<{
  trace: ReasoningTrace | null
  /** 浮动模式（消息流内联）vs 固定侧边栏 */
  floating?: boolean
}>()

const traceRef = computed(() => props.trace) as ComputedRef<ReasoningTrace | null>
const vectorRetrieval = useVectorRetrieval(traceRef)

const activeTab = ref<'timeline' | 'retrieval' | 'vector'>('timeline')
const expanded = ref(!props.floating)

watchEffect(() => {
  if (props.trace && props.trace.stages.some((s) => s.status === 'running')) {
    expanded.value = true
  }
})

const tabs = [
  { key: 'timeline' as const, label: '执行链路' },
  { key: 'retrieval' as const, label: '文档检索' },
  { key: 'vector' as const, label: '向量匹配' }
]

const totalMs = computed(() => props.trace?.totalMs)
const progress = computed(() => {
  if (!props.trace) return 0
  const stages = props.trace.stages.filter((s) => s.stage !== 'done')
  const done = stages.filter((s) => s.status === 'done').length
  return Math.round((done / stages.length) * 100)
})

const isRunning = computed(
  () => props.trace?.stages.some((s) => s.status === 'running') ?? false
)
</script>

<template>
  <div class="reasoning-panel" :class="{ floating, collapsed: !expanded }">
    <div class="panel-head" @click="expanded = !expanded">
      <div class="head-left">
        <div class="head-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path
              d="M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M16.24 16.24l2.83 2.83 M2 12h4 M18 12h4 M4.93 19.07l2.83-2.83 M16.24 7.76l2.83-2.83"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
            <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
        <div>
          <div class="head-title">AI 推理链路</div>
          <div class="head-sub">
            <span v-if="isRunning" class="status running">运行中</span>
            <span v-else class="status">已完成</span>
            <span v-if="totalMs" class="head-meta">{{ formatDuration(totalMs) }}</span>
            <span class="head-meta">进度 {{ progress }}%</span>
          </div>
        </div>
      </div>
      <button class="toggle-btn">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            :transform="expanded ? '' : 'rotate(180 12 12)'"
          />
        </svg>
      </button>
    </div>

    <div v-if="expanded" class="panel-body">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }" />
      </div>

      <div class="tabs">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="tab"
          :class="{ active: activeTab === t.key }"
          @click="activeTab = t.key"
        >
          {{ t.label }}
        </button>
      </div>

      <div class="tab-content">
        <StageTimeline
          v-show="activeTab === 'timeline'"
          :trace="trace"
        />
        <RetrievalHits
          v-show="activeTab === 'retrieval'"
          :hits="trace?.hits ?? []"
        />
        <VectorMatchViz
          v-show="activeTab === 'vector'"
          :hits="trace?.hits ?? []"
          :query-vector="vectorRetrieval.queryVector.value"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.reasoning-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-surface);
}

.reasoning-panel.floating {
  margin: 12px 0 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(79, 124, 255, 0.06), rgba(123, 60, 255, 0.04));
  border-bottom: 1px solid var(--color-border-soft);
  cursor: pointer;
  user-select: none;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.head-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--grad-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.head-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.head-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--color-text-3);
  margin-top: 2px;
}

.status {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-bg-soft);
  color: var(--color-text-3);
}

.status.running {
  background: rgba(79, 124, 255, 0.12);
  color: var(--color-primary);
  position: relative;
  padding-left: 14px;
}

.status.running::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: pulse 1.2s infinite;
}

.head-meta {
  color: var(--color-text-muted);
}

.toggle-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-3);
  transition: transform 0.2s ease;
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.progress-bar {
  height: 3px;
  background: var(--color-bg-soft);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--grad-primary);
  transition: width 0.4s ease;
  border-radius: 0 2px 2px 0;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border-soft);
  padding: 0 12px;
  flex-shrink: 0;
}

.tab {
  padding: 10px 14px;
  font-size: 12px;
  color: var(--color-text-3);
  border-bottom: 2px solid transparent;
  transition: all 0.18s ease;
}

.tab:hover {
  color: var(--color-text);
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 500;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px 16px;
}

.reasoning-panel:not(.floating) .tab-content {
  padding: 16px;
}
</style>
