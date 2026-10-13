/**
 * useSSE - Vue 响应式 SSE 连接封装
 * 基于 SSEClient，将流式事件接入响应式状态
 */
import { ref, shallowRef, onBeforeUnmount } from 'vue'
import { SSEClient, parseSSEData, type SSERawEvent } from '@/utils/sse'
import type { SSEEvent } from '@/types'

export interface UseSSEOptions {
  url: string
  method?: 'POST' | 'GET'
  headers?: Record<string, string>
  debounceMs?: number
  autoReconnect?: boolean
  maxRetries?: number
  debug?: boolean
  /** 每条事件回调 */
  onEvent?: (evt: SSEEvent) => void
  onError?: (err: unknown, retries: number) => void
  onOpen?: () => void
  onClose?: (retriesLeft: number) => void
}

export function useSSE(options: UseSSEOptions) {
  const connected = ref(false)
  const error = ref<string | null>(null)
  const retryCount = ref(0)
  const lastEvent = shallowRef<SSEEvent | null>(null)

  const client = new SSEClient({
    url: options.url,
    method: options.method ?? 'POST',
    headers: options.headers,
    debounceMs: options.debounceMs ?? 0,
    autoReconnect: options.autoReconnect ?? false,
    maxRetries: options.maxRetries ?? 3,
    debug: options.debug ?? false
  })

  client.onOpen = () => {
    connected.value = true
    error.value = null
    options.onOpen?.()
  }

  client.onError = (err, retries) => {
    error.value = (err as Error)?.message ?? String(err)
    retryCount.value = retries
    options.onError?.(err, retries)
  }

  client.onClose = (retriesLeft) => {
    connected.value = false
    options.onClose?.(retriesLeft)
  }

  client.onEvent = (raw: SSERawEvent) => {
    const data = parseSSEData(raw.data)
    const evt: SSEEvent = {
      event: raw.event as SSEEvent['event'],
      data,
      id: raw.id,
      retry: raw.retry
    }
    lastEvent.value = evt
    options.onEvent?.(evt)
  }

  /** 发送请求（携带 body，每次可不同） */
  const send = (body: Record<string, unknown> | null) => {
    client.connect(body)
  }

  /** 立即发送（跳过防抖） */
  const sendNow = (body: Record<string, unknown> | null) => {
    client.connectImmediately(body)
  }

  const abort = () => client.abort()
  const reset = () => client.resetRetries()

  onBeforeUnmount(() => {
    client.abort()
  })

  return {
    connected,
    error,
    retryCount,
    lastEvent,
    client,
    send,
    sendNow,
    abort,
    reset
  }
}
