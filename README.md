# KnowStream AI · RAG 问答平台

![Vue 3](https://img.shields.io/badge/Vue-3.4-4FC08D?logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Pinia](https://img.shields.io/badge/Pinia-2-FFD859?logo=pinia&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

> 轻量化企业私有文档 RAG 问答平台：知识库管理与大模型流式对话，适配内部知识检索场景。内置 Mock 模式，无需后端即可完整体验 RAG 流程与 SSE 流式输出。

## ✨ 特性

- **模块化 Composable 架构**：对话（`useChat`）、文档解析（`useDocumentParser`）、向量检索（`useVectorRetrieval`）、SSE 连接（`useSSE`）各自独立，业务逻辑解耦
- **SSE 流式输出**：自研 `SSEClient` 支持请求防抖、断线重连（可配最大重试次数）、事件流解析，接入 Vue 响应式状态，优化多轮长对话交互体验
- **AI 推理可视化面板**：直观展示「文档检索 – 向量匹配 – 大模型生成」完整执行链路（阶段时间线 + 向量匹配可视化 + 命中片段列表）
- **知识库管理**：文档上传、解析、列表管理，检索命中片段与对话上下文联动
- **Markdown 渲染**：markdown-it + highlight.js，代码高亮、流式增量渲染

## 🛠 技术栈

- **框架**：Vue 3（`<script setup>` + Composition API）+ TypeScript
- **构建**：Vite 5 + vue-tsc 类型检查
- **路由 / 状态**：Vue Router 4 + Pinia
- **渲染**：markdown-it 14 + highlight.js 11
- **数据层**：SSE（自研客户端封装）+ Mock 服务

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务（默认 Mock 模式）
npm run dev

# 类型检查
npm run type-check

# 生产构建
npm run build
```

### 接入真实后端

复制 `.env.example` 为 `.env`，按需修改：

```bash
VITE_USE_MOCK=false          # 关闭 Mock
VITE_API_BASE=http://localhost:8000   # 后端地址
```

对接接口：`POST /api/chat/stream`（SSE 流式问答）、`/api/document/parse`（文档解析）等。

## 📦 目录结构

```
KnowStream AI
├── src/
│   ├── api/
│   │   ├── index.ts            # 接口层
│   │   └── mock.ts             # Mock 实现（RAG / SSE 全流程模拟）
│   ├── components/
│   │   ├── chat/               # 对话面板 / 消息列表 / 会话列表 / 输入框
│   │   ├── knowledge/          # 文档列表 / 上传
│   │   ├── reasoning/          # 推理可视化面板（阶段时间线 / 向量匹配 / 检索命中）
│   │   └── layout/             # 应用侧边栏
│   ├── composables/
│   │   ├── useChat.ts          # 对话逻辑
│   │   ├── useSSE.ts           # Vue 响应式 SSE 封装
│   │   ├── useVectorRetrieval.ts  # 向量检索
│   │   ├── useDocumentParser.ts   # 文档解析
│   │   └── useKnowledgeBase.ts    # 知识库管理
│   ├── utils/
│   │   ├── sse.ts              # SSEClient（防抖 / 重连 / 事件解析）
│   │   └── markdown.ts         # Markdown 渲染配置
│   ├── views/                  # ChatView / KnowledgeView
│   └── types/index.ts
└── vite.config.ts
```

## 📄 License

MIT
