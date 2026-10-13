/**
 * useKnowledgeBase - 知识库管理 Composable
 *
 * 职责：
 * - 知识库 CRUD
 * - 与文档解析模块联动（统计文档数 / chunk 数）
 * - 持久化至 localStorage
 *
 * 业务解耦：本 composable 仅维护知识库元信息，
 * 文档归属关系由 useDocumentParser 管理（按 knowledgeBaseId 过滤展示）。
 */
import { ref, computed } from 'vue'
import type { KnowledgeBase, KnowledgeDoc } from '@/types'
import {
  loadKnowledgeBases,
  saveKnowledgeBases
} from '@/api'
import { uid, deepClone, formatDate } from '@/utils/helpers'

const DEFAULT_EMBEDDING_MODEL = 'bge-large-zh-v1.5'

export function useKnowledgeBase() {
  const knowledgeBases = ref<KnowledgeBase[]>(loadKnowledgeBases())
  const activeId = ref<string | undefined>(knowledgeBases.value[0]?.id)

  const activeKnowledgeBase = computed<KnowledgeBase | null>(
    () => knowledgeBases.value.find((k) => k.id === activeId.value) ?? null
  )

  function create(name: string, description?: string): KnowledgeBase {
    const kb: KnowledgeBase = {
      id: uid('kb'),
      name: name.trim() || '未命名知识库',
      description,
      docCount: 0,
      totalChunks: 0,
      embeddingModel: DEFAULT_EMBEDDING_MODEL,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    knowledgeBases.value.unshift(kb)
    activeId.value = kb.id
    persist()
    return kb
  }

  function update(id: string, patch: Partial<KnowledgeBase>) {
    const kb = knowledgeBases.value.find((k) => k.id === id)
    if (!kb) return
    Object.assign(kb, patch)
    kb.updatedAt = Date.now()
    persist()
  }

  function remove(id: string) {
    const idx = knowledgeBases.value.findIndex((k) => k.id === id)
    if (idx === -1) return
    knowledgeBases.value.splice(idx, 1)
    if (activeId.value === id) {
      activeId.value = knowledgeBases.value[0]?.id
    }
    persist()
  }

  function select(id: string) {
    activeId.value = id
  }

  /** 根据文档列表统计知识库的 docCount / totalChunks */
  function syncFromDocuments(docs: KnowledgeDoc[]) {
    for (const kb of knowledgeBases.value) {
      const mine = docs.filter((d) => (d as KnowledgeDoc & { kbId?: string }).kbId === kb.id)
      kb.docCount = mine.length
      kb.totalChunks = mine
        .filter((d) => d.status === 'ready')
        .reduce((s, d) => s + d.chunkCount, 0)
      kb.updatedAt = Date.now()
    }
    persist()
  }

  function persist() {
    saveKnowledgeBases(deepClone(knowledgeBases.value))
  }

  return {
    knowledgeBases,
    activeId,
    activeKnowledgeBase,
    formatDate,
    create,
    update,
    remove,
    select,
    syncFromDocuments
  }
}
