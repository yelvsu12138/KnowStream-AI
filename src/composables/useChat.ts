/**
 * useChat - 对话核心业务 Composable
 *
 * 职责：
 * - 管理多会话与消息列表
 * - 通过 SSE 驱动流式生成
 * - 装配 RAG 推理链路（reasoning trace）
 * - 持久化至 localStorage
 *
 * 业务解耦：本 composable 只关心会话与消息状态机，
 * 网络层使用 chatStream API（mock / real），不耦合具体实现。
 */
import { ref, computed, reactive } from 'vue'
import type {
  ChatMessage,
  Conversation,
  ReasoningStage,
  ReasoningStageNode,
  ReasoningTrace,
  SSEEvent,
  SSEErrorPayload,
  SSEMetaPayload,
  SSERetrievalPayload,
  SSEStagePayload,
  SSETokenPayload,
  StageStatus
} from '@/types'
import { chatStream, loadConversations, saveConversations } from '@/api'
import { uid, deepClone } from '@/utils/helpers'

/** 阶段元信息（label / description） */
const STAGE_META: Record<ReasoningStage, { label: string; description: string }> = {
  query_rewrite: { label: '查询重写', description: '对用户问题进行语义归一与扩展' },
  retrieval: { label: '文档检索', description: '从知识库召回候选文档片段' },
  vector_match: { label: '向量匹配', description: '基于语义向量计算相似度并排序' },
  rerank: { label: '重排', description: '对召回结果二次精排' },
  generation: { label: '大模型生成', description: '基于检索上下文生成回答' },
  done: { label: '完成', description: '推理链路结束' }
}

const ORDER: ReasoningStage[] = [
  'query_rewrite',
  'retrieval',
  'vector_match',
  'rerank',
  'generation',
  'done'
]

export interface UseChatOptions {
  knowledgeBaseId?: string
}

export function useChat(options: UseChatOptions = {}) {
  const conversations = ref<Conversation[]>(loadConversations())
  const activeId = ref<string | null>(conversations.value[0]?.id ?? null)
  const streaming = ref(false)
  const abortFlag = ref(false)
  /** 当前关联的推理链路（生成中） */
  const currentTrace = ref<ReasoningTrace | null>(null)
  /** 全局错误（非消息级） */
  const globalError = ref<string | null>(null)

  const activeConversation = computed<Conversation | null>(
    () => conversations.value.find((c) => c.id === activeId.value) ?? null
  )

  const activeMessages = computed<ChatMessage[]>(() => {
    return activeConversation.value?.messages ?? []
  })

  // ============ 会话管理 ============

  function createConversation(title = '新对话'): Conversation {
    const conv: Conversation = {
      id: uid('conv'),
      title,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      knowledgeBaseId: options.knowledgeBaseId
    }
    conversations.value.unshift(conv)
    activeId.value = conv.id
    persist()
    return conv
  }

  function selectConversation(id: string) {
    activeId.value = id
  }

  function deleteConversation(id: string) {
    const idx = conversations.value.findIndex((c) => c.id === id)
    if (idx === -1) return
    conversations.value.splice(idx, 1)
    if (activeId.value === id) {
      activeId.value = conversations.value[0]?.id ?? null
    }
    persist()
  }

  function renameConversation(id: string, title: string) {
    const c = conversations.value.find((x) => x.id === id)
    if (c) {
      c.title = title || c.title
      c.updatedAt = Date.now()
      persist()
    }
  }

  function clearAll() {
    conversations.value = []
    activeId.value = null
    persist()
  }

  // ============ 消息发送（SSE 驱动） ============

  /**
   * 发送用户消息并触发 SSE 流式回复
   * @returns 生成的 assistant 消息 id（便于 UI 跟踪）
   */
  async function send(text: string): Promise<string | null> {
    const content = text.trim()
    if (!content || streaming.value) return null

    // 兜底创建会话
    if (!activeConversation.value) createConversation()

    const conv = activeConversation.value!
    const userMsg: ChatMessage = {
      id: uid('msg'),
      role: 'user',
      content,
      status: 'done',
      createdAt: Date.now()
    }
    conv.messages.push(userMsg)

    // 创建 assistant 占位消息
    const assistantId = uid('msg')
    const assistantMsg = reactive<ChatMessage>({
      id: assistantId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      createdAt: Date.now(),
      reasoning: reactive<ReasoningTrace>({
        query: content,
        stages: ORDER.map((s) => ({
          stage: s,
          status: 'pending' as StageStatus,
          label: STAGE_META[s].label,
          description: STAGE_META[s].description
        })),
        hits: []
      })
    })
    conv.messages.push(assistantMsg)

    currentTrace.value = assistantMsg.reasoning!
    streaming.value = true
    abortFlag.value = false

    // 构建历史（不含本次用户消息）
    const history = conv.messages
      .filter((m) => m.id !== userMsg.id && m.id !== assistantId)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }))

    const controller = new AbortController()
    const startTs = Date.now()

    try {
      const stream = await chatStream({
        query: content,
        conversationId: conv.id,
        knowledgeBaseId: conv.knowledgeBaseId,
        history,
        signal: controller.signal
      })

      await consumeStream(stream, assistantMsg, controller)
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError' || abortFlag.value) {
        assistantMsg.status = 'aborted'
      } else {
        assistantMsg.status = 'error'
        assistantMsg.error = (err as Error)?.message ?? '请求失败'
        globalError.value = assistantMsg.error!
      }
    } finally {
      assistantMsg.elapsedMs = Date.now() - startTs
      assistantMsg.reasoning!.totalMs = assistantMsg.elapsedMs
      // 标记剩余 pending 阶段为 skipped（视觉收敛）
      for (const s of assistantMsg.reasoning!.stages) {
        if (s.status === 'pending') s.status = 'done'
      }
      streaming.value = false
      currentTrace.value = null
      conv.updatedAt = Date.now()
      // 自动取标题
      if (conv.title === '新对话' && conv.messages.length === 2) {
        conv.title = content.slice(0, 24) || '新对话'
      }
      persist()
    }

    return assistantId
  }

  /** 中止当前流式生成 */
  function abort() {
    abortFlag.value = true
    streaming.value = false
    currentTrace.value = null
    const conv = activeConversation.value
    if (conv) {
      const last = conv.messages[conv.messages.length - 1]
      if (last && last.role === 'assistant' && last.status === 'streaming') {
        last.status = 'aborted'
      }
    }
  }

  /** 重试上一条用户消息 */
  async function retryLast(): Promise<void> {
    const conv = activeConversation.value
    if (!conv || streaming.value) return
    // 找到最后一条用户消息
    let lastUserIdx = -1
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      if (conv.messages[i].role === 'user') {
        lastUserIdx = i
        break
      }
    }
    if (lastUserIdx === -1) return
    const userMsg = conv.messages[lastUserIdx]
    // 移除其后所有消息
    conv.messages.splice(lastUserIdx + 1)
    await send(userMsg.content)
  }

  /** 清空当前会话消息 */
  function clearActiveMessages() {
    if (activeConversation.value) {
      activeConversation.value.messages = []
      activeConversation.value.updatedAt = Date.now()
      persist()
    }
  }

  // ============ SSE 流消费 ============

  async function consumeStream(
    stream: ReadableStream<Uint8Array>,
    msg: ChatMessage,
    controller: AbortController
  ): Promise<void> {
    const reader = stream.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    const trace = msg.reasoning!

    type Frame = { event: string; data: string[] }
    let cur: Frame = { event: 'message', data: [] }

    const flush = () => {
      if (cur.data.length === 0 && cur.event === 'message') {
        cur = { event: 'message', data: [] }
        return
      }
      const raw = cur.data.join('\n')
      // 将 data 文本解析为 JSON 对象（SSE 协议 data 字段约定为 JSON 字符串）
      let payload: unknown = raw
      const trimmed = raw.trim()
      if (trimmed) {
        try {
          payload = JSON.parse(trimmed)
        } catch {
          payload = raw
        }
      }
      handleEvent(
        { event: cur.event, data: payload } as SSEEvent,
        msg,
        trace
      )
      cur = { event: 'message', data: [] }
    }

    while (true) {
      if (abortFlag.value) {
        controller.abort()
        break
      }
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).replace(/\r$/, '')
        buffer = buffer.slice(idx + 1)
        if (line === '') {
          flush()
          continue
        }
        if (line.startsWith(':')) continue
        const colon = line.indexOf(':')
        const field = colon === -1 ? line : line.slice(0, colon)
        let val = colon === -1 ? '' : line.slice(colon + 1)
        if (val.startsWith(' ')) val = val.slice(1)
        if (field === 'event') cur.event = val
        else if (field === 'data') cur.data.push(val)
      }
    }
    if (buffer) {
      const line = buffer.replace(/\r$/, '')
      if (line) {
        const colon = line.indexOf(':')
        const field = colon === -1 ? line : line.slice(0, colon)
        let val = colon === -1 ? '' : line.slice(colon + 1)
        if (val.startsWith(' ')) val = val.slice(1)
        if (field === 'event') cur.event = val
        else if (field === 'data') cur.data.push(val)
      }
    }
    flush()
  }

  function handleEvent(
    evt: SSEEvent,
    msg: ChatMessage,
    trace: ReasoningTrace
  ): void {
    switch (evt.event) {
      case 'stage': {
        const p = evt.data as SSEStagePayload
        const node = trace.stages.find((s) => s.stage === p.stage)
        if (!node) return
        node.status = p.status
        node.label = p.label ?? node.label
        node.description = p.description ?? node.description
        if (p.status === 'running') node.startedAt = Date.now()
        if (p.status === 'done') {
          node.endedAt = Date.now()
          node.durationMs =
            p.durationMs ?? (node.endedAt - (node.startedAt ?? node.endedAt))
        }
        if (p.status === 'error') node.status = 'error'
        break
      }
      case 'retrieval': {
        const p = evt.data as SSERetrievalPayload
        if (p.rewrittenQuery) trace.rewrittenQuery = p.rewrittenQuery
        trace.hits = p.hits ?? []
        // 标记 retrieval 阶段附带的 hits
        const retrievalNode = trace.stages.find(
          (s) => s.stage === 'retrieval'
        ) as ReasoningStageNode | undefined
        if (retrievalNode) {
          retrievalNode.detail = `召回 ${trace.hits.length} 个候选片段`
        }
        const vectorNode = trace.stages.find(
          (s) => s.stage === 'vector_match'
        ) as ReasoningStageNode | undefined
        if (vectorNode && trace.hits.length) {
          const top = trace.hits[0]
          vectorNode.detail = `Top-1 相似度 ${(top.score * 100).toFixed(1)}%`
        }
        break
      }
      case 'token': {
        const p = evt.data as SSETokenPayload
        msg.content += p.token
        // 同步：标记 generation 阶段 running
        const genNode = trace.stages.find((s) => s.stage === 'generation')
        if (genNode && genNode.status !== 'running') {
          genNode.status = 'running'
          genNode.startedAt = Date.now()
        }
        break
      }
      case 'meta': {
        const p = evt.data as SSEMetaPayload
        if (p.tokenCount !== undefined) msg.tokenCount = p.tokenCount
        if (p.totalMs !== undefined) trace.totalMs = p.totalMs
        break
      }
      case 'done': {
        msg.status = 'done'
        const genNode = trace.stages.find((s) => s.stage === 'generation')
        if (genNode) {
          genNode.status = 'done'
          genNode.endedAt = Date.now()
          genNode.durationMs = genNode.endedAt - (genNode.startedAt ?? genNode.endedAt)
        }
        const doneNode = trace.stages.find((s) => s.stage === 'done')
        if (doneNode) doneNode.status = 'done'
        trace.sources = trace.hits.map((h) => ({
          docName: h.docName,
          chunkIndex: h.chunkIndex
        }))
        break
      }
      case 'error': {
        const p = evt.data as SSEErrorPayload
        msg.status = 'error'
        msg.error = p.message
        globalError.value = p.message
        break
      }
    }
  }

  // ============ 持久化 ============

  function persist() {
    // 去掉 reactive 代理后再存
    saveConversations(deepClone(conversations.value))
  }

  return {
    conversations,
    activeId,
    activeConversation,
    activeMessages,
    streaming,
    currentTrace,
    globalError,
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    clearAll,
    send,
    abort,
    retryLast,
    clearActiveMessages
  }
}
