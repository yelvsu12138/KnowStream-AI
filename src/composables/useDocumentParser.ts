/**
 * useDocumentParser - 文档解析 Composable
 *
 * 职责：
 * - 上传文档（File → 元信息）
 * - 调用解析进度（文本提取 → 分块 → 清洗）
 * - 调用向量化进度（embedding）
 * - 维护文档状态机：pending → parsing → embedding → ready / failed
 * - 持久化文档列表
 *
 * 业务解耦：解析与向量化分阶段独立进行，UI 可观察每阶段进度。
 */
import { ref, computed, reactive } from 'vue'
import type { KnowledgeDoc, DocStatus } from '@/types'
import {
  parseDocument,
  embedDocument,
  loadDocuments,
  saveDocuments
} from '@/api'
import { uid, formatBytes, deepClone } from '@/utils/helpers'

export function useDocumentParser() {
  const documents = ref<KnowledgeDoc[]>(loadDocuments())
  const uploading = ref(false)
  const parsingIds = reactive<Set<string>>(new Set())
  const embeddingIds = reactive<Set<string>>(new Set())
  const error = ref<string | null>(null)

  const readyDocs = computed(() =>
    documents.value.filter((d) => d.status === 'ready')
  )

  const totalChunks = computed(() =>
    documents.value.reduce((s, d) => s + (d.status === 'ready' ? d.chunkCount : 0), 0)
  )

  /** 推断文档类型 */
  function inferType(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    const map: Record<string, string> = {
      pdf: 'PDF',
      doc: 'Word',
      docx: 'Word',
      txt: 'TXT',
      md: 'Markdown',
      csv: 'CSV',
      xlsx: 'Excel',
      pptx: 'PPT'
    }
    return map[ext] ?? ext.toUpperCase() ?? 'FILE'
  }

  /** 上传并启动解析 + 向量化 */
  async function upload(file: File): Promise<KnowledgeDoc | null> {
    if (uploading.value) return null
    uploading.value = true
    error.value = null

    const doc: KnowledgeDoc = reactive({
      id: uid('doc'),
      name: file.name,
      size: file.size,
      type: inferType(file.name),
      status: 'pending' as DocStatus,
      chunkCount: 0,
      tokenCount: 0,
      uploadedAt: Date.now(),
      progress: 0
    })

    documents.value.unshift(doc)
    persist()

    try {
      // 1. 解析
      parsingIds.add(doc.id)
      doc.status = 'parsing'
      const { chunkCount, tokenCount } = await parseDocument(
        file.name,
        (p, statusLabel) => {
          doc.progress = p
          ;(doc as KnowledgeDoc & { parseStage?: string }).parseStage = statusLabel
        }
      )
      doc.chunkCount = chunkCount
      doc.tokenCount = tokenCount
      doc.parsedAt = Date.now()
      doc.status = 'embedding'
      parsingIds.delete(doc.id)

      // 2. 向量化
      embeddingIds.add(doc.id)
      await embedDocument(
        (p) => {
          // progress 复用同一字段，向量化阶段映射 50→100
          doc.progress = 50 + Math.floor(p / 2)
        }
      )
      doc.status = 'ready'
      doc.progress = 100
      embeddingIds.delete(doc.id)
    } catch (err) {
      doc.status = 'failed'
      doc.error = (err as Error)?.message ?? '解析失败'
      doc.progress = 0
      error.value = doc.error
      parsingIds.delete(doc.id)
      embeddingIds.delete(doc.id)
    } finally {
      uploading.value = false
      persist()
    }
    return doc
  }

  /** 批量上传 */
  async function uploadMany(files: FileList | File[]): Promise<void> {
    const arr = Array.from(files)
    for (const f of arr) {
      // eslint-disable-next-line no-await-in-loop
      await upload(f)
    }
  }

  /** 删除文档 */
  function remove(docId: string) {
    const idx = documents.value.findIndex((d) => d.id === docId)
    if (idx !== -1) {
      documents.value.splice(idx, 1)
      persist()
    }
  }

  /** 重新解析失败文档 */
  async function retry(docId: string): Promise<void> {
    const doc = documents.value.find((d) => d.id === docId)
    if (!doc || doc.status === 'ready') return
    // 模拟重传：这里没有真实文件，仅重置状态机
    doc.status = 'parsing'
    doc.progress = 0
    doc.error = undefined
    parsingIds.add(doc.id)
    try {
      const { chunkCount, tokenCount } = await parseDocument(
        doc.name,
        (p) => {
          doc.progress = p
        }
      )
      doc.chunkCount = chunkCount
      doc.tokenCount = tokenCount
      doc.parsedAt = Date.now()
      doc.status = 'embedding'
      parsingIds.delete(doc.id)
      embeddingIds.add(doc.id)
      await embedDocument((p) => {
        doc.progress = 50 + Math.floor(p / 2)
      })
      doc.status = 'ready'
      doc.progress = 100
      embeddingIds.delete(doc.id)
    } catch (err) {
      doc.status = 'failed'
      doc.error = (err as Error)?.message ?? '重试失败'
      parsingIds.delete(doc.id)
      embeddingIds.delete(doc.id)
    }
    persist()
  }

  function persist() {
    saveDocuments(deepClone(documents.value))
  }

  /** 关联知识库 ID 用于过滤（可选，预留扩展） */
  function setKnowledgeBase(_id: string) {
    // 预留：未来按知识库过滤文档列表
  }

  return {
    documents,
    uploading,
    parsingIds,
    embeddingIds,
    error,
    readyDocs,
    totalChunks,
    inferType,
    formatBytes,
    upload,
    uploadMany,
    remove,
    retry,
    setKnowledgeBase
  }
}
