/**
 * useVectorRetrieval - 向量检索 Composable
 *
 * 职责：
 * - 维护检索命中的文档块（hits）
 * - 提供向量可视化所需数据：相似度排序、维度投影、匹配热力
 * - 计算匹配统计（命中数、Top-K、平均相似度）
 *
 * 业务解耦：不发起真实检索请求，而是接收 useChat 推送的 hits，
 * 仅做可视化与统计计算。
 */
import { computed, type Ref } from 'vue'
import type { ReasoningTrace, RetrievalHit } from '@/types'
import {
  pseudoVector,
  cosineSimilarity,
  formatNumber
} from '@/utils/helpers'

export function useVectorRetrieval(traceRef: Ref<ReasoningTrace | null>) {
  const hits = computed<RetrievalHit[]>(() => traceRef.value?.hits ?? [])

  const sortedHits = computed(() =>
    [...hits.value].sort((a, b) => b.score - a.score)
  )

  const topHit = computed<RetrievalHit | null>(() => sortedHits.value[0] ?? null)

  const hitCount = computed(() => hits.value.length)

  const avgScore = computed(() => {
    if (hits.value.length === 0) return 0
    const sum = hits.value.reduce((s, h) => s + h.score, 0)
    return sum / hits.value.length
  })

  const maxScore = computed(() =>
    hits.value.reduce((m, h) => Math.max(m, h.score), 0)
  )

  /** 唯一文档数 */
  const uniqueDocCount = computed(() => {
    const set = new Set(hits.value.map((h) => h.docId))
    return set.size
  })

  /**
   * 向量可视化：将命中块的 vectorSeed 视为低维向量，
   * 用于面板展示。query 也生成一个 queryVector 用于比对。
   */
  const queryVector = computed<number[]>(() => {
    const q = traceRef.value?.rewrittenQuery ?? traceRef.value?.query ?? ''
    // 用 query 字符串生成确定性 seed
    let seed = 0
    for (let i = 0; i < q.length; i++) seed = (seed * 31 + q.charCodeAt(i)) >>> 0
    return pseudoVector(12, seed + 1)
  })

  /** 每条命中块对应向量 + 与 query 相似度（演示用） */
  const hitVectors = computed(() =>
    sortedHits.value.map((h) => ({
      hit: h,
      vector: h.vectorSeed ?? pseudoVector(12, h.id.charCodeAt(0) + 1),
      similarity: cosineSimilarity(
        queryVector.value,
        h.vectorSeed ?? pseudoVector(12, h.id.charCodeAt(0) + 1)
      )
    }))
  )

  /** 维度热力：每个维度取命中块的最大绝对值用于归一 */
  const dimensionHeat = computed(() => {
    const dim = 12
    const max = new Array(dim).fill(0)
    for (const v of hitVectors.value) {
      for (let i = 0; i < dim; i++) {
        if (Math.abs(v.vector[i]) > Math.abs(max[i])) max[i] = v.vector[i]
      }
    }
    return max
  })

  /** 将 0-1 相似度映射到颜色（绿→蓝→紫） */
  function scoreColor(score: number): string {
    if (score >= 0.75) return '#16a34a'
    if (score >= 0.5) return '#0ea5e9'
    if (score >= 0.3) return '#f59e0b'
    return '#ef4444'
  }

  /** 相似度百分比 */
  function scorePct(score: number): string {
    return `${(score * 100).toFixed(1)}%`
  }

  /** 统计文本 */
  const statsText = computed(() => {
    if (hitCount.value === 0) return '暂无检索结果'
    return `命中 ${hitCount.value} 个片段 · 来自 ${uniqueDocCount.value} 篇文档 · 平均相似度 ${scorePct(avgScore.value)}`
  })

  return {
    hits,
    sortedHits,
    topHit,
    hitCount,
    avgScore,
    maxScore,
    uniqueDocCount,
    queryVector,
    hitVectors,
    dimensionHeat,
    formatNumber,
    scoreColor,
    scorePct,
    statsText
  }
}
