/**
 * 全局类型定义 - RAG 问答平台
 */

/* ============ 对话相关 ============ */

export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageStatus =
  | 'idle'        // 待发送
  | 'sending'     // 发送中
  | 'streaming'   // 流式接收中
  | 'done'        // 完成
  | 'error'       // 错误
  | 'aborted'     // 中止

/** 单条对话消息 */
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  status: MessageStatus
  createdAt: number
  /** 关联的推理链路数据（assistant 消息） */
  reasoning?: ReasoningTrace
  /** 错误信息 */
  error?: string
  /** 耗时(ms) */
  elapsedMs?: number
  /** token 数 */
  tokenCount?: number
}

/** 会话 */
export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
  knowledgeBaseId?: string
}

/* ============ RAG 推理链路 ============ */

export type ReasoningStage =
  | 'query_rewrite'    // 查询重写
  | 'retrieval'        // 文档检索
  | 'vector_match'     // 向量匹配
  | 'rerank'           // 重排
  | 'generation'       // 大模型生成
  | 'done'

export type StageStatus = 'pending' | 'running' | 'done' | 'error'

/** 推理阶段节点 */
export interface ReasoningStageNode {
  stage: ReasoningStage
  status: StageStatus
  label: string
  description?: string
  /** 阶段耗时(ms) */
  durationMs?: number
  /** 阶段产物（如检索片段、匹配分数等） */
  detail?: string
  startedAt?: number
  endedAt?: number
}

/** 向量匹配命中的文档块 */
export interface RetrievalHit {
  id: string
  docId: string
  docName: string
  chunkIndex: number
  content: string
  /** 相似度分数 0-1 */
  score: number
  /** 命中向量维度示意（用于可视化） */
  vectorSeed?: number[]
}

/** 完整推理链路（一次问答） */
export interface ReasoningTrace {
  query: string
  rewrittenQuery?: string
  stages: ReasoningStageNode[]
  /** 检索命中的文档块 */
  hits: RetrievalHit[]
  /** 最终引用来源 */
  sources?: Array<{ docName: string; chunkIndex: number }>
  /** 总耗时 */
  totalMs?: number
}

/* ============ 知识库与文档 ============ */

export type DocStatus =
  | 'pending'      // 待解析
  | 'parsing'      // 解析中
  | 'embedding'    // 向量化中
  | 'ready'        // 可用
  | 'failed'       // 失败

export interface KnowledgeDoc {
  id: string
  name: string
  size: number
  type: string
  status: DocStatus
  chunkCount: number
  tokenCount: number
  uploadedAt: number
  parsedAt?: number
  progress: number   // 0-100
  error?: string
}

export interface KnowledgeBase {
  id: string
  name: string
  description?: string
  docCount: number
  totalChunks: number
  embeddingModel: string
  createdAt: number
  updatedAt: number
}

/* ============ SSE 流式事件 ============ */

export type SSEEventType =
  | 'stage'        // 推理阶段切换
  | 'retrieval'    // 检索结果
  | 'token'        // 生成 token
  | 'done'         // 完成
  | 'error'        // 错误
  | 'meta'         // 元信息（耗时、token数等）

export interface SSEEvent<T = unknown> {
  event: SSEEventType
  data: T
  id?: string
  retry?: number
}

export interface SSEMetaPayload {
  totalMs?: number
  tokenCount?: number
  model?: string
}

export interface SSEStagePayload {
  stage: ReasoningStage
  status: StageStatus
  label: string
  description?: string
  durationMs?: number
}

export interface SSERetrievalPayload {
  hits: RetrievalHit[]
  rewrittenQuery?: string
}

export interface SSETokenPayload {
  token: string
}

export interface SSEErrorPayload {
  message: string
  code?: string
}
