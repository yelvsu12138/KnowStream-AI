<script setup lang="ts">
import { computed } from 'vue'
import type { RetrievalHit } from '@/types'
import { truncate } from '@/utils/helpers'

const props = defineProps<{
  hits: RetrievalHit[]
}>()

const sorted = computed(() =>
  [...props.hits].sort((a, b) => b.score - a.score)
)

function scoreColor(score: number): string {
  if (score >= 0.75) return '#16a34a'
  if (score >= 0.5) return '#0ea5e9'
  if (score >= 0.3) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(score: number): string {
  if (score >= 0.75) return '高'
  if (score >= 0.5) return '中'
  if (score >= 0.3) return '低'
  return '弱'
}
</script>

<template>
  <div class="retrieval-hits">
    <div v-if="hits.length === 0" class="empty">
      <div class="empty-icon">🔍</div>
      <div>暂无检索结果</div>
      <div class="empty-hint">等待文档检索阶段产出命中片段</div>
    </div>

    <div v-for="(hit, i) in sorted" :key="hit.id" class="hit">
      <div class="hit-rank">#{{ i + 1 }}</div>
      <div class="hit-main">
        <div class="hit-head">
          <span class="hit-doc">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
              <path
                d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
            </svg>
            {{ hit.docName }}
          </span>
          <span class="hit-chunk">段 {{ hit.chunkIndex + 1 }}</span>
        </div>
        <div class="hit-content">{{ truncate(hit.content, 140) }}</div>
        <div class="hit-foot">
          <div class="score-bar">
            <div
              class="score-fill"
              :style="{ width: hit.score * 100 + '%', background: scoreColor(hit.score) }"
            />
          </div>
          <span class="score-text" :style="{ color: scoreColor(hit.score) }">
            {{ (hit.score * 100).toFixed(1) }}%
          </span>
          <span class="score-label" :style="{ background: scoreColor(hit.score) + '22', color: scoreColor(hit.score) }">
            {{ scoreLabel(hit.score) }}相似度
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.retrieval-hits {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty {
  text-align: center;
  padding: 24px 12px;
  color: var(--color-text-3);
}

.empty-icon {
  font-size: 22px;
  margin-bottom: 6px;
}

.empty-hint {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.hit {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  transition: all 0.18s ease;
}

.hit:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.hit-rank {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--grad-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.hit-main {
  flex: 1;
  min-width: 0;
}

.hit-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.hit-doc {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text);
}

.hit-chunk {
  font-size: 10px;
  color: var(--color-text-3);
  background: var(--color-bg-soft);
  padding: 1px 5px;
  border-radius: 3px;
}

.hit-content {
  font-size: 12px;
  color: var(--color-text-2);
  line-height: 1.55;
  margin-bottom: 6px;
}

.hit-foot {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-bar {
  flex: 1;
  height: 6px;
  background: var(--color-bg-soft);
  border-radius: 3px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.score-text {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
}

.score-label {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
}
</style>
