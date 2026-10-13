<script setup lang="ts">
import { computed } from 'vue'
import type { ReasoningTrace, ReasoningStageNode } from '@/types'
import { formatDuration } from '@/utils/helpers'

const props = defineProps<{
  trace: ReasoningTrace | null
}>()

const stages = computed<ReasoningStageNode[]>(() => props.trace?.stages ?? [])

const query = computed(() => props.trace?.query ?? '')
const rewrittenQuery = computed(() => props.trace?.rewrittenQuery)
</script>

<template>
  <div class="timeline">
    <div class="query-block">
      <div class="q-label">原始查询</div>
      <div class="q-text">{{ query }}</div>
      <template v-if="rewrittenQuery && rewrittenQuery !== query">
        <div class="q-label sub">重写查询</div>
        <div class="q-text rewritten">{{ rewrittenQuery }}</div>
      </template>
    </div>

    <div class="stages">
      <div
        v-for="(s, i) in stages"
        :key="s.stage"
        class="stage"
        :class="`status-${s.status}`"
      >
        <div class="stage-marker">
          <div class="dot">
            <span v-if="s.status === 'running'" class="ring" />
            <svg
              v-else-if="s.status === 'done'"
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
            >
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span v-else-if="s.status === 'error'">!</span>
            <span v-else class="idx">{{ i + 1 }}</span>
          </div>
          <div v-if="i < stages.length - 1" class="connector" />
        </div>
        <div class="stage-body">
          <div class="stage-head">
            <span class="stage-label">{{ s.label }}</span>
            <span class="stage-stage">{{ s.stage }}</span>
            <span v-if="s.durationMs" class="stage-time">
              {{ formatDuration(s.durationMs) }}
            </span>
            <span v-if="s.status === 'running'" class="stage-run">运行中</span>
          </div>
          <div v-if="s.description" class="stage-desc">{{ s.description }}</div>
          <div v-if="s.detail" class="stage-detail">
            <span class="detail-tag">产出</span>
            <span>{{ s.detail }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline {
  font-size: 13px;
}

.query-block {
  background: var(--color-surface-2);
  border-radius: var(--radius);
  padding: 10px 12px;
  margin-bottom: 16px;
  border: 1px solid var(--color-border-soft);
}

.q-label {
  font-size: 11px;
  color: var(--color-text-3);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.q-label.sub {
  margin-top: 8px;
}

.q-text {
  font-size: 13px;
  color: var(--color-text);
  line-height: 1.5;
}

.q-text.rewritten {
  color: var(--color-primary);
}

.stages {
  display: flex;
  flex-direction: column;
}

.stage {
  display: flex;
  gap: 12px;
  min-height: 56px;
}

.stage-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  color: var(--color-text-3);
  position: relative;
  z-index: 1;
}

.connector {
  width: 2px;
  flex: 1;
  background: var(--color-border);
  margin: 2px 0;
}

.stage.status-running .dot {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(79, 124, 255, 0.08);
}

.stage.status-done .dot {
  background: var(--color-success);
  border-color: var(--color-success);
  color: #fff;
}

.stage.status-error .dot {
  background: var(--color-error);
  border-color: var(--color-error);
  color: #fff;
}

.stage.status-running .connector {
  background: linear-gradient(
    180deg,
    var(--color-primary) 0%,
    var(--color-border) 100%
  );
}

.stage.status-done .connector {
  background: var(--color-success);
}

.ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--color-primary);
  animation: pulse 1.5s infinite;
}

.stage-body {
  flex: 1;
  padding-bottom: 12px;
}

.stage-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.stage-label {
  font-weight: 600;
  color: var(--color-text);
  font-size: 13px;
}

.stage-stage {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-text-muted);
  background: var(--color-bg-soft);
  padding: 1px 6px;
  border-radius: 3px;
}

.stage-time {
  font-size: 11px;
  color: var(--color-text-3);
  background: rgba(245, 158, 11, 0.1);
  padding: 1px 6px;
  border-radius: 3px;
  color: #d97706;
}

.stage-run {
  font-size: 10px;
  color: var(--color-primary);
  background: rgba(79, 124, 255, 0.12);
  padding: 1px 6px;
  border-radius: 3px;
}

.stage-desc {
  font-size: 12px;
  color: var(--color-text-3);
  margin-bottom: 4px;
}

.stage-detail {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  margin-top: 4px;
}

.detail-tag {
  font-size: 10px;
  color: var(--color-accent);
  background: rgba(0, 194, 168, 0.12);
  padding: 1px 5px;
  border-radius: 3px;
}
</style>
