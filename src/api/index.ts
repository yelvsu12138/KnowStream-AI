/**
 * API 适配层
 * 默认走 Mock，可在 ENV 中切换至真实后端
 */
import type { Conversation } from '@/types'
import { createMockSSEStream, mockParseDocument, mockEmbedding } from './mock'

export interface ChatRequest {
  query: string
  conversationId?: string
  knowledgeBaseId?: string
  history?: Array<{ role: string; content: string }>
  signal?: AbortSignal
}

/**
 * 发起对话 SSE 流（返回 ReadableStream）
 * - 开发环境：直接走 mock
 * - 生产环境：fetch 后端 /api/chat/stream
 */
export async function chatStream(
  req: ChatRequest
): Promise<ReadableStream<Uint8Array>> {
  if (USE_MOCK) {
    return createMockSSEStream({
      query: req.query,
      knowledgeBaseId: req.knowledgeBaseId,
      history: req.history,
      signal: req.signal,
      flaky: 0.06
    })
  }
  const resp = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify({
      query: req.query,
      conversationId: req.conversationId,
      knowledgeBaseId: req.knowledgeBaseId,
      history: req.history
    }),
    signal: req.signal
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.body!
}

/* ============ 文档解析 ============ */

export async function parseDocument(
  docName: string,
  onProgress: (p: number, status: string) => void,
  signal?: AbortSignal
) {
  if (USE_MOCK) return mockParseDocument(docName, onProgress, signal)
  // 真实后端：可换成 WebSocket / 轮询
  const resp = await fetch('/api/document/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: docName }),
    signal
  })
  return resp.json()
}

export async function embedDocument(
  onProgress: (p: number) => void,
  signal?: AbortSignal
) {
  if (USE_MOCK) return mockEmbedding(onProgress, signal)
  return Promise.resolve()
}

/* ============ 知识库 / 会话持久化 ============ */

const LS_KEY_CONV = 'knowstream:conversations'
const LS_KEY_KB = 'knowstream:knowledgeBases'
const LS_KEY_DOCS = 'knowstream:documents'

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(LS_KEY_CONV)
    return raw ? (JSON.parse(raw) as Conversation[]) : []
  } catch {
    return []
  }
}

export function saveConversations(list: Conversation[]): void {
  try {
    localStorage.setItem(LS_KEY_CONV, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function loadKnowledgeBases<T>(): T[] {
  try {
    const raw = localStorage.getItem(LS_KEY_KB)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

export function saveKnowledgeBases<T>(list: T[]): void {
  try {
    localStorage.setItem(LS_KEY_KB, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function loadDocuments<T>(): T[] {
  try {
    const raw = localStorage.getItem(LS_KEY_DOCS)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

export function saveDocuments<T>(list: T[]): void {
  try {
    localStorage.setItem(LS_KEY_DOCS, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

/** 是否使用 Mock 后端 */
export const USE_MOCK = (import.meta.env?.VITE_USE_MOCK ?? 'true') !== 'false'
