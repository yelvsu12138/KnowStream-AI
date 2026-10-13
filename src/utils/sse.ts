/**
 * SSE 长连接客户端
 * - 支持 fetch + ReadableStream 实现逐字流式输出
 * - 内置请求防抖（debounce）
 * - 支持手动中止（abort）与断线自动重连（exponential backoff）
 * - 解析 SSE 协议：`event:` / `data:` / `id:` / `retry:`
 *
 * 设计说明：
 *   浏览器原生 EventSource 仅支持 GET 请求且无法自定义 header/body，
 *   RAG 问答需要 POST 携带历史消息与知识库 ID，因此改用 fetch 流式读取。
 */

export interface SSEClientOptions {
  /** 请求 URL */
  url: string
  /** 请求方法（默认 POST） */
  method?: 'POST' | 'GET'
  /** 请求头 */
  headers?: Record<string, string>
  /** 请求体 */
  body?: BodyInit | Record<string, unknown> | null
  /** 防抖间隔(ms)，连续触发时取最后一次 */
  debounceMs?: number
  /** 是否启用断线自动重连 */
  autoReconnect?: boolean
  /** 最大重连次数（默认 3） */
  maxRetries?: number
  /** 首次重连延迟(ms)，指数退避 */
  initialRetryDelay?: number
  /** 单条事件超时(ms)，0 表示不限 */
  timeoutMs?: number
  /** 调试日志 */
  debug?: boolean
}

export interface SSERawEvent {
  event: string
  data: string
  id?: string
  retry?: number
}

export type SSEEventCallback = (event: SSERawEvent) => void
export type SSEErrorCallback = (err: unknown, retryCount: number) => void
export type SSEOpenCallback = () => void
export type SSECloseCallback = (retriesLeft: number) => void

interface ParsedLineState {
  currentEvent: string
  currentData: string[]
  currentId?: string
  currentRetry?: number
}

export class SSEClient {
  private opts: Required<Omit<SSEClientOptions, 'body' | 'headers'>> & {
    body: BodyInit | Record<string, unknown> | null
    headers: Record<string, string>
  }

  private controller: AbortController | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private retryCount = 0
  private manuallyAborted = false
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private decoder: TextDecoder = new TextDecoder('utf-8')

  /** 事件回调（外部注入） */
  public onEvent: SSEEventCallback | null = null
  public onError: SSEErrorCallback | null = null
  public onOpen: SSEOpenCallback | null = null
  public onClose: SSECloseCallback | null = null

  constructor(options: SSEClientOptions) {
    this.opts = {
      url: options.url,
      method: options.method ?? 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(options.headers ?? {})
      },
      body: options.body ?? null,
      debounceMs: options.debounceMs ?? 0,
      autoReconnect: options.autoReconnect ?? false,
      maxRetries: options.maxRetries ?? 3,
      initialRetryDelay: options.initialRetryDelay ?? 800,
      timeoutMs: options.timeoutMs ?? 0,
      debug: options.debug ?? false
    }
  }

  /** 是否处于活动连接 */
  get isActive(): boolean {
    return this.controller !== null && !this.manuallyAborted
  }

  /** 当前重试次数 */
  get retries(): number {
    return this.retryCount
  }

  /**
   * 启动连接（带防抖）。
   * 若 debounceMs > 0，连续调用会以最后一次为准。
   * @param bodyOverride 本次请求 body 覆盖（用于多轮对话每次携带不同消息）
   */
  connect(bodyOverride?: BodyInit | Record<string, unknown> | null): void {
    if (bodyOverride !== undefined) {
      this._pendingBody = bodyOverride
    }
    if (this.opts.debounceMs > 0) {
      if (this.debounceTimer) clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => this._doConnect(), this.opts.debounceMs)
      return
    }
    this._doConnect()
  }

  /** 立即发送（跳过防抖） */
  connectImmediately(bodyOverride?: BodyInit | Record<string, unknown> | null): void {
    if (bodyOverride !== undefined) {
      this._pendingBody = bodyOverride
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this._doConnect()
  }

  private _pendingBody: BodyInit | Record<string, unknown> | null = null

  /** 手动中止（不触发自动重连） */
  abort(): void {
    this.manuallyAborted = true
    this._cleanup()
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    this.retryCount = 0
  }

  /** 重置重试计数（用于显式重连场景） */
  resetRetries(): void {
    this.retryCount = 0
  }

  // ============ 内部实现 ============

  private async _doConnect(): Promise<void> {
    // 清理上一次连接
    this._cleanup()
    this.manuallyAborted = false

    this.controller = new AbortController()
    const { signal } = this.controller

    // 超时定时器
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null
    if (this.opts.timeoutMs > 0) {
      timeoutHandle = setTimeout(() => {
        this._log('SSE timeout, aborting')
        this.controller?.abort()
      }, this.opts.timeoutMs)
    }

    try {
      const body = this._normalizeBody(this._pendingBody ?? this.opts.body)
      this._log('SSE connecting', { url: this.opts.url, retry: this.retryCount })

      const resp = await fetch(this.opts.url, {
        method: this.opts.method,
        headers: this.opts.headers,
        body,
        signal,
        // 关键：保持流式
        cache: 'no-store',
        credentials: 'same-origin'
      })

      if (!resp.ok) {
        throw new Error(`SSE HTTP ${resp.status} ${resp.statusText}`)
      }
      if (!resp.body) {
        throw new Error('SSE 响应体为空（流式不可用）')
      }

      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
        timeoutHandle = null
      }

      // 连接建立成功 → 重置重试计数
      this.retryCount = 0
      this.onOpen?.()

      this.reader = resp.body.getReader()
      await this._readStream()

      // 正常关闭
      this.onClose?.(this.opts.maxRetries - this.retryCount)
    } catch (err) {
      if (timeoutHandle) clearTimeout(timeoutHandle)

      // 手动中止不算错误
      if (this.manuallyAborted || signal.aborted) {
        this._log('SSE aborted by user')
        this.onClose?.(this.opts.maxRetries - this.retryCount)
        return
      }

      this._log('SSE error', String(err))
      this.onError?.(err, this.retryCount)

      // 断线重连
      if (this.opts.autoReconnect && this.retryCount < this.opts.maxRetries) {
        this.retryCount += 1
        const delay = this._computeRetryDelay()
        this._log(`SSE retry in ${delay}ms (attempt ${this.retryCount})`)
        this.retryTimer = setTimeout(() => this._doConnect(), delay)
      } else {
        this.onClose?.(0)
      }
    } finally {
      this._cleanupReader()
    }
  }

  private async _readStream(): Promise<void> {
    if (!this.reader) return

    let buffer = ''
    const state: ParsedLineState = {
      currentEvent: 'message',
      currentData: [],
      currentId: undefined,
      currentRetry: undefined
    }

    while (true) {
      const { done, value } = await this.reader.read()
      if (done) break

      buffer += this.decoder.decode(value, { stream: true })

      // 按行解析 SSE 协议
      let idx: number
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const rawLine = buffer.slice(0, idx).replace(/\r$/, '')
        buffer = buffer.slice(idx + 1)
        this._processLine(rawLine, state)
      }
    }

    // 处理末尾缓冲
    if (buffer.length > 0) {
      this._processLine(buffer.replace(/\r$/, ''), state)
    }
    // 刷新最后一帧（若缓冲未以空行结尾）
    this._flushEvent(state)
  }

  private _processLine(line: string, state: ParsedLineState): void {
    // 空行 → 分发当前事件
    if (line === '') {
      this._flushEvent(state)
      return
    }

    // 注释行（以 : 开头）→ 心跳，忽略
    if (line.startsWith(':')) return

    const colon = line.indexOf(':')
    let field: string
    let valuePart: string

    if (colon === -1) {
      field = line
      valuePart = ''
    } else {
      field = line.slice(0, colon)
      // 规范：值若以一个空格开头则跳过该空格
      valuePart = line.slice(colon + 1)
      if (valuePart.startsWith(' ')) valuePart = valuePart.slice(1)
    }

    switch (field) {
      case 'event':
        state.currentEvent = valuePart
        break
      case 'data':
        state.currentData.push(valuePart)
        break
      case 'id':
        state.currentId = valuePart
        break
      case 'retry': {
        const n = Number(valuePart)
        if (!Number.isNaN(n)) state.currentRetry = n
        break
      }
      default:
        // 未知字段忽略
        break
    }
  }

  private _flushEvent(state: ParsedLineState): void {
    if (state.currentData.length === 0 && state.currentEvent === 'message') {
      // 没有数据则跳过
      this._resetState(state)
      return
    }

    const evt: SSERawEvent = {
      event: state.currentEvent,
      data: state.currentData.join('\n'),
      id: state.currentId,
      retry: state.currentRetry
    }
    this.onEvent?.(evt)

    this._resetState(state)
  }

  private _resetState(state: ParsedLineState): void {
    state.currentEvent = 'message'
    state.currentData = []
    state.currentId = undefined
    state.currentRetry = undefined
  }

  /** 指数退避 + 抖动 */
  private _computeRetryDelay(): number {
    const base = this.opts.initialRetryDelay
    const exp = base * Math.pow(2, this.retryCount - 1)
    const jitter = Math.random() * 200
    return Math.min(exp + jitter, 30000)
  }

  private _normalizeBody(
    body: BodyInit | Record<string, unknown> | null
  ): BodyInit | null {
    if (body === null) return null
    if (typeof body === 'string') return body
    if (body instanceof FormData) return body
    if (body instanceof URLSearchParams) return body
    if (typeof body === 'object') return JSON.stringify(body)
    return body as BodyInit
  }

  private _cleanup(): void {
    if (this.controller) {
      try {
        this.controller.abort()
      } catch {
        /* noop */
      }
      this.controller = null
    }
    this._cleanupReader()
  }

  private _cleanupReader(): void {
    if (this.reader) {
      try {
        this.reader.releaseLock()
      } catch {
        /* noop */
      }
      this.reader = null
    }
  }

  private _log(...args: unknown[]): void {
    if (this.opts.debug) {
      // eslint-disable-next-line no-console
      console.debug('[SSE]', ...args)
    }
  }
}

/** 工具：尝试将 SSE data 文本解析为 JSON */
export function parseSSEData<T = unknown>(raw: string): T | string {
  if (!raw) return '' as unknown as T
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed) as T
  } catch {
    return raw
  }
}
