<script setup lang="ts">
import { computed } from 'vue'
import type { ReasoningTrace } from '@/types'
import { formatDuration } from '@/utils/helpers'

const props = defineProps<{
  trace: ReasoningTrace
}>()

const open = defineModel<boolean>('open', { default: false })

const toggle = () => {
  open.value = !open.value
}

const totalMs = computed(() => props.trace.totalMs)
const hitCount = computed(() => props.trace.hits.length)
const doneStages = computed(
  () => props.trace.stages.filter((s) => s.status === 'done').length
)
</script>

<template>
  <button class="trigger" :class="{ open: open }" @click="toggle">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        :transform="open ? 'rotate(90 12 12)' : ''"
      />
    </svg>
    <span>推理链路</span>
    <span class="badge">{{ doneStages }}/{{ trace.stages.length }}</span>
    <span v-if="hitCount" class="badge alt">{{ hitCount }} 命中</span>
    <span v-if="totalMs" class="badge time">{{ formatDuration(totalMs) }}</span>
  </button>
</template>

<style scoped>
.trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  color: var(--color-primary);
  background: rgba(79, 124, 255, 0.08);
  border: 1px solid rgba(79, 124, 255, 0.25);
  transition: all 0.18s ease;
  svg {
    transition: transform 0.2s ease;
  }
}

.trigger:hover {
  background: rgba(79, 124, 255, 0.14);
}

.badge {
  padding: 1px 6px;
  background: rgba(79, 124, 255, 0.18);
  border-radius: 999px;
  font-size: 11px;
}

.badge.alt {
  background: rgba(0, 194, 168, 0.18);
  color: #00a890;
}

.badge.time {
  background: rgba(245, 158, 11, 0.18);
  color: #d97706;
}
</style>
