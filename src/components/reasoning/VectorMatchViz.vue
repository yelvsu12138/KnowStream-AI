<script setup lang="ts">
import { computed } from 'vue'
import type { RetrievalHit } from '@/types'
import { cosineSimilarity, pseudoVector, formatNumber } from '@/utils/helpers'

const props = defineProps<{
  hits: RetrievalHit[]
  queryVector: number[]
}>()

const DIM = 12

const hitVectors = computed(() =>
  [...props.hits]
    .sort((a, b) => b.score - a.score)
    .map((h) => {
      const v = h.vectorSeed ?? pseudoVector(DIM, h.id.charCodeAt(0) + 1)
      const sim = cosineSimilarity(props.queryVector, v)
      return { hit: h, vector: v, similarity: sim }
    })
)

/** 维度最大绝对值（用于热力归一） */
const dimMax = computed(() => {
  const arr = new Array(DIM).fill(0)
  for (const hv of hitVectors.value) {
    for (let i = 0; i < DIM; i++) {
      if (Math.abs(hv.vector[i]) > Math.abs(arr[i])) arr[i] = hv.vector[i]
    }
  }
  return arr
})

function cellColor(val: number, max: number): string {
  if (max === 0) return 'transparent'
  const ratio = Math.min(Math.abs(val) / Math.abs(max || 1), 1)
  // 蓝(-) → 透明(0) → 红(+)
  if (val > 0) {
    return `rgba(239, 68, 68, ${0.15 + ratio * 0.65})`
  }
  return `rgba(79, 124, 255, ${0.15 + ratio * 0.65})`
}

const avgSim = computed(() => {
  if (hitVectors.value.length === 0) return 0
  const sum = hitVectors.value.reduce((s, h) => s + h.similarity, 0)
  return sum / hitVectors.value.length
})

const stats = computed(() => {
  if (props.hits.length === 0) return '暂无向量数据'
  return `命中 ${props.hits.length} 个向量 · 平均相似度 ${(avgSim.value * 100).toFixed(1)}%`
})

function scoreColor(score: number): string {
  if (score >= 0.75) return '#16a34a'
  if (score >= 0.5) return '#0ea5e9'
  if (score >= 0.3) return '#f59e0b'
  return '#ef4444'
}
</script>

<template>
  <div class="vector-viz">
    <div class="stats-bar">{{ stats }}</div>

    <!-- 查询向量条 -->
    <div class="query-vector">
      <div class="qv-label">
        <span class="dot query" />
        Query 向量
      </div>
      <div class="qv-cells">
        <div
          v-for="(v, i) in queryVector"
          :key="i"
          class="qv-cell"
          :style="{ background: cellColor(v, dimMax[i]) }"
          :title="`维度 ${i + 1}: ${v.toFixed(2)}`"
        >
          <span class="qv-val">{{ v.toFixed(1) }}</span>
        </div>
      </div>
    </div>

    <!-- 命中向量列表 -->
    <div class="hits-vectors">
      <div v-for="(hv, i) in hitVectors" :key="hv.hit.id" class="hit-row">
        <div class="hit-index">
          <span class="rank">#{{ i + 1 }}</span>
          <span class="sim" :style="{ color: scoreColor(hv.hit.score) }">
            {{ (hv.similarity * 100).toFixed(1) }}%
          </span>
        </div>
        <div class="hit-cells">
          <div
            v-for="(v, j) in hv.vector"
            :key="j"
            class="hv-cell"
            :style="{ background: cellColor(v, dimMax[j]) }"
            :title="`维度 ${j + 1}: ${v.toFixed(2)}`"
          >
            <span>{{ v.toFixed(1) }}</span>
          </div>
        </div>
        <div class="hit-name">{{ hv.hit.docName }} · 段 {{ hv.hit.chunkIndex + 1 }}</div>
      </div>
    </div>

    <!-- 图例 -->
    <div class="legend">
      <div class="legend-item">
        <span class="swatch" style="background: rgba(79, 124, 255, 0.7)" />
        <span>负向</span>
      </div>
      <div class="legend-item">
        <span class="swatch" style="background: rgba(239, 68, 68, 0.7)" />
        <span>正向</span>
      </div>
      <div class="legend-item">
        <span class="swatch query" />
        <span>Query</span>
      </div>
      <div class="legend-item note">
        共 {{ formatNumber(DIM) }} 维示意 · 实际为 1024/1536 维
      </div>
    </div>
  </div>
</template>

<style scoped>
.vector-viz {
  font-size: 12px;
}

.stats-bar {
  padding: 6px 10px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--color-text-3);
  margin-bottom: 12px;
  text-align: center;
}

.query-vector {
  margin-bottom: 14px;
  padding: 8px;
  background: rgba(79, 124, 255, 0.04);
  border: 1px dashed rgba(79, 124, 255, 0.3);
  border-radius: var(--radius-sm);
}

.qv-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-primary);
  margin-bottom: 6px;
  font-weight: 500;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.query {
  background: var(--color-primary);
  box-shadow: 0 0 6px rgba(79, 124, 255, 0.5);
}

.qv-cells,
.hit-cells {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2px;
}

.qv-cell,
.hv-cell {
  height: 22px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.9);
  font-family: var(--font-mono);
  transition: transform 0.18s ease;
}

.qv-cell:hover,
.hv-cell:hover {
  transform: scale(1.15);
  z-index: 1;
}

.hits-vectors {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
}

.hit-index {
  width: 56px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.rank {
  font-size: 11px;
  color: var(--color-text-3);
}

.sim {
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-mono);
}

.hit-cells {
  flex: 1;
}

.hv-cell {
  height: 18px;
  font-size: 8px;
}

.hit-name {
  width: 110px;
  flex-shrink: 0;
  font-size: 10px;
  color: var(--color-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border-soft);
  font-size: 10px;
  color: var(--color-text-3);
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  display: inline-block;
}

.swatch.query {
  background: var(--color-primary);
}

.legend-item.note {
  margin-left: auto;
  color: var(--color-text-muted);
}
</style>
