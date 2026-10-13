/**
 * Markdown 渲染器（基于 markdown-it + highlight.js）
 */
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/common'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: false,
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`
      } catch {
        /* fallthrough */
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

// 目标新窗口打开
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options)
  }
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const aIndex = tokens[idx].attrIndex('target')
  if (aIndex < 0) tokens[idx].attrPush(['target', '_blank'])
  else tokens[idx].attrs![aIndex][1] = '_blank'
  const relIndex = tokens[idx].attrIndex('rel')
  if (relIndex < 0) tokens[idx].attrPush(['rel', 'noopener noreferrer'])
  return defaultLinkOpen(tokens, idx, options, env, self)
}

export function renderMarkdown(text: string): string {
  if (!text) return ''
  return md.render(text)
}
