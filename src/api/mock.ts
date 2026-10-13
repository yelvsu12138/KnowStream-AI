/**
 * Mock 后端服务
 * 模拟 RAG 问答的完整链路：查询重写 → 文档检索 → 向量匹配 → 重排 → 大模型生成
 * 通过 ReadableStream 模拟 SSE 流式输出
 */
import type {
  ReasoningStage,
  RetrievalHit,
  StageStatus
} from '@/types'
import { pseudoVector } from '@/utils/helpers'

/** 模拟知识库语料（用于检索命中演示） */
const MOCK_CORPUS: Array<{
  id: string
  docName: string
  chunkIndex: number
  content: string
  keywords: string[]
}> = [
  {
    id: 'c1',
    docName: '员工手册-2026版.pdf',
    chunkIndex: 3,
    content:
      '公司实行标准工时制，工作时间为周一至周五 9:00-18:00，午休 12:00-13:00。员工享有带薪年假，工龄 1-3 年 5 天，3-10 年 10 天，10 年以上 15 天。',
    keywords: ['工时', '工作时间', '年假', '休假', '带薪']
  },
  {
    id: 'c2',
    docName: '员工手册-2026版.pdf',
    chunkIndex: 7,
    content:
      '差旅报销标准：经济舱机票按实报销，高铁/动车二等座全额报销。住宿一线城市上限 600 元/晚，二三线城市 450 元/晚，需附发票原件。',
    keywords: ['差旅', '报销', '机票', '住宿', '发票']
  },
  {
    id: 'c3',
    docName: '研发流程规范.docx',
    chunkIndex: 1,
    content:
      '所有新功能开发须经过需求评审 → 技术方案设计 → 代码评审 → 测试验证 → 灰度发布五个阶段。代码评审至少 2 人 approve 方可合并主干。',
    keywords: ['研发', '流程', '代码评审', '灰度', '测试']
  },
  {
    id: 'c4',
    docName: '信息安全制度.pdf',
    chunkIndex: 2,
    content:
      '生产环境数据库访问须经主管审批并启用审计日志。严禁将生产数据导出至个人设备，违者按严重违规处理。敏感字段需脱敏后才能进入测试环境。',
    keywords: ['安全', '数据库', '审计', '生产', '脱敏']
  },
  {
    id: 'c5',
    docName: '信息安全制度.pdf',
    chunkIndex: 5,
    content:
      '账号权限遵循最小授权原则，离职/转岗 24 小时内须回收权限。VPN 接入需绑定设备指纹，定期更换证书。',
    keywords: ['权限', '账号', 'VPN', '离职', '授权']
  },
  {
    id: 'c6',
    docName: '绩效考核办法.pdf',
    chunkIndex: 4,
    content:
      '季度绩效采用 OKR + 360 评估，季度评定 S/A/B/C/D 五档，连续两次 C 进入改进计划。绩效结果影响季度奖金系数 0.6-1.5。',
    keywords: ['绩效', '考核', 'OKR', '奖金', '评定']
  },
  {
    id: 'c7',
    docName: '新人入职指南.md',
    chunkIndex: 0,
    content:
      '新员工入职首日完成：1) 领取工卡与设备 2) 配置开发环境 3) 完成信息安全培训 4) 加入对应团队群组 5) 导师 1v1 沟通制定 30/60/90 计划。',
    keywords: ['入职', '新人', '设备', '培训', '导师']
  },
  {
    id: 'c8',
    docName: '财务报销流程.pdf',
    chunkIndex: 2,
    content:
      '费用报销须在发生 30 日内提交，超期需主管特批。流程：员工填报 → 直属主管审批 → 财务复核 → 出纳付款，一般 5 个工作日到账。',
    keywords: ['报销', '流程', '审批', '财务', '付款']
  }
]

/** 模拟的回答模板（拼接检索片段 + 总结） */
const ANSWER_TEMPLATES = [
  (query: string, hits: RetrievalHit[]): string => {
    const top = hits[0]
    return `根据知识库中的资料，针对「${query}」的回答如下：

${top.content}

**要点总结：**
- 信息来源：${top.docName}（第 ${top.chunkIndex + 1} 段）
- 相似度：${(top.score * 100).toFixed(1)}%
- ${
      hits.length > 1
        ? `另检索到 ${hits.length - 1} 条相关片段作为补充上下文`
        : '该问题在知识库中匹配度较高'
    }

如需更详细内容，可在知识库中检索原文档获取完整章节。`
  },
  (query: string, hits: RetrievalHit[]): string => {
    const list = hits
      .slice(0, 3)
      .map((h, i) => `${i + 1}. **${h.docName}**（第 ${h.chunkIndex + 1} 段，相似度 ${(h.score * 100).toFixed(0)}%）：${h.content}`)
      .join('\n\n')
    return `## 关于「${query}」

结合知识库检索结果，整理如下：

${list}

> 以上信息来源于企业内部文档，仅供参考。`
  }
]

interface MockSSEOptions {
  query: string
  knowledgeBaseId?: string
  history?: Array<{ role: string; content: string }>
  /** 模拟网络抖动，0-1 之间，默认 0.1 */
  flaky?: number
  signal?: AbortSignal
}

/**
 * 简易关键词命中评分
 */
function scoreHit(query: string, doc: (typeof MOCK_CORPUS)[number]): number {
  const q = query.toLowerCase()
  let score = 0
  for (const kw of doc.keywords) {
    if (q.includes(kw.toLowerCase())) score += 0.25
  }
  // 兜底随机分数
  if (score === 0) score = 0.1 + Math.random() * 0.3
  else score += Math.random() * 0.15
  return Math.min(score, 0.98)
}

/** 模拟检索 */
function mockRetrieve(query: string): RetrievalHit[] {
  return MOCK_CORPUS.map((d) => ({
    id: d.id,
    docId: d.id.split('_')[0],
    docName: d.docName,
    chunkIndex: d.chunkIndex,
    content: d.content,
    score: scoreHit(query, d),
    vectorSeed: pseudoVector(12, d.id.charCodeAt(0) + d.chunkIndex + 1)
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .filter((h) => h.score > 0.15)
}

const STAGE_SEQUENCE: Array<{
  stage: ReasoningStage
  label: string
  description: string
}> = [
  {
    stage: 'query_rewrite',
    label: '查询重写',
    description: '对用户问题进行语义归一与扩展'
  },
  {
    stage: 'retrieval',
    label: '文档检索',
    description: '从知识库召回候选文档片段'
  },
  {
    stage: 'vector_match',
    label: '向量匹配',
    description: '基于语义向量计算相似度并排序'
  },
  {
    stage: 'rerank',
    label: '重排',
    description: '对召回结果二次精排'
  },
  {
    stage: 'generation',
    label: '大模型生成',
    description: '基于检索上下文生成自然语言回答'
  }
]

/**
 * 启动 Mock SSE 流，返回 ReadableStream（用于 /api/chat SSE 接口模拟）
 */
export function createMockSSEStream(opts: MockSSEOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const flaky = opts.flaky ?? 0.05

  const stageMeta = new Map<ReasoningStage, { start: number; end?: number }>()
  let cancelled = false

  function emit(event: string, data: unknown): Uint8Array {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    return encoder.encode(payload)
  }

  async function sleep(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(resolve, ms)
      if (opts.signal) {
        opts.signal.addEventListener('abort', () => {
          clearTimeout(t)
          reject(new DOMException('Aborted', 'AbortError'))
        })
      }
    })
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // 1. 阶段流转
        for (const s of STAGE_SEQUENCE) {
          if (cancelled) return
          // 模拟偶尔抖动
          if (Math.random() < flaky) await sleep(1200 + Math.random() * 800)

          stageMeta.set(s.stage, { start: Date.now() })

          // running
          controller.enqueue(
            emit('stage', {
              stage: s.stage,
              status: 'running' as StageStatus,
              label: s.label,
              description: s.description
            })
          )
          await sleep(400 + Math.random() * 500)

          // retrieval / vector_match 阶段附带 hits
          if (s.stage === 'retrieval' || s.stage === 'vector_match') {
            const hits = mockRetrieve(opts.query)
            controller.enqueue(
              emit('retrieval', {
                hits,
                rewrittenQuery: opts.query.replace('？', '?')
              })
            )
            await sleep(200)
          }

          // done
          const meta = stageMeta.get(s.stage)!
          meta.end = Date.now()
          controller.enqueue(
            emit('stage', {
              stage: s.stage,
              status: 'done' as StageStatus,
              label: s.label,
              description: s.description,
              durationMs: meta.end - meta.start
            })
          )
        }

        // 2. 生成阶段：逐 token 输出
        const hits = mockRetrieve(opts.query)
        const answerFn =
          ANSWER_TEMPLATES[Math.floor(Math.random() * ANSWER_TEMPLATES.length)]
        const fullText = answerFn(opts.query, hits)

        // 按 token（粗粒度按字符）切片
        const tokens = fullText.match(/[\s\S]{1,3}/g) ?? [fullText]
        let acc = ''
        for (const tk of tokens) {
          if (cancelled) return
          acc += tk
          controller.enqueue(emit('token', { token: tk }))
          await sleep(20 + Math.random() * 60)
        }

        // 3. 元信息 + 完成
        controller.enqueue(
          emit('meta', {
            totalMs: stageMeta.get('query_rewrite')!.start
              ? Date.now() - stageMeta.get('query_rewrite')!.start
              : undefined,
            tokenCount: tokens.length,
            model: 'knowstream-llm-7b'
          })
        )
        controller.enqueue(emit('done', {}))
        controller.close()
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') {
          controller.close()
          return
        }
        controller.enqueue(
          emit('error', {
            message: (err as Error).message || '模拟生成失败',
            code: 'MOCK_ERROR'
          })
        )
        controller.close()
      }
    },
    cancel() {
      cancelled = true
    }
  })
}

/** Mock 文档解析：返回分块进度 */
export async function mockParseDocument(
  _docName: string,
  onProgress: (p: number, status: string) => void,
  signal?: AbortSignal
): Promise<{ chunkCount: number; tokenCount: number }> {
  const stages = [
    { p: 15, label: '文本提取' },
    { p: 40, label: '分块切分' },
    { p: 70, label: '清洗归一' },
    { p: 100, label: '解析完成' }
  ]
  for (const s of stages) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, 600 + Math.random() * 600)
      signal?.addEventListener('abort', () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    })
    onProgress(s.p, s.label)
  }
  return {
    chunkCount: Math.floor(8 + Math.random() * 40),
    tokenCount: Math.floor(1200 + Math.random() * 8000)
  }
}

/** Mock 向量化：返回进度 */
export async function mockEmbedding(
  onProgress: (p: number) => void,
  signal?: AbortSignal
): Promise<void> {
  for (let p = 0; p <= 100; p += 10) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, 200 + Math.random() * 200)
      signal?.addEventListener('abort', () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    })
    onProgress(p)
  }
}
