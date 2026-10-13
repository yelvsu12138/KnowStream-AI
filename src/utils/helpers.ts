/**
 * 通用工具函数
 */

/** 生成短 ID */
export function uid(prefix = ''): string {
  const s =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  return prefix ? `${prefix}_${s}` : s
}

/** 格式化字节数 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

/** 格式化时间戳 */
export function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** 格式化日期 */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 格式化耗时 */
export function formatDuration(ms?: number): string {
  if (ms === undefined) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/** 数字千分位 */
export function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN')
}

/** 简单防抖 */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  wait = 300
): (...args: Parameters<T>) => void {
  let t: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), wait)
  }
}

/** 深拷贝（结构化克隆降级） */
export function deepClone<T>(obj: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj)
    } catch {
      /* fallthrough */
    }
  }
  return JSON.parse(JSON.stringify(obj))
}

/** 截断文本 */
export function truncate(text: string, len = 80): string {
  if (text.length <= len) return text
  return text.slice(0, len) + '…'
}

/** 生成可视化用的伪向量（仅用于面板展示） */
export function pseudoVector(dim = 12, seed = 0): number[] {
  const arr: number[] = []
  let s = seed || 1
  for (let i = 0; i < dim; i++) {
    // 简单线性同余
    s = (s * 9301 + 49297) % 233280
    arr.push(parseFloat(((s / 233280) * 2 - 1).toFixed(2)))
  }
  return arr
}

/** 计算两个向量的余弦相似度（用于演示） */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

/** 下载文本 */
export function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
