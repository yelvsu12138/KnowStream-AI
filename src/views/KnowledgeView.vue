<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSharedKB } from '@/composables/shared'
import { useDocumentParser } from '@/composables/useDocumentParser'
import DocumentUpload from '@/components/knowledge/DocumentUpload.vue'
import DocumentList from '@/components/knowledge/DocumentList.vue'
import { formatNumber, formatDate } from '@/utils/helpers'

const {
  knowledgeBases,
  activeId,
  activeKnowledgeBase,
  create: createKb,
  select: selectKb,
  remove: removeKb,
  syncFromDocuments
} = useSharedKB()

const {
  documents,
  uploading,
  parsingIds,
  embeddingIds,
  uploadMany,
  remove: removeDoc,
  retry: retryDoc
} = useDocumentParser()

const showCreate = ref(false)
const newKbName = ref('')
const newKbDesc = ref('')

function submitCreate() {
  if (!newKbName.value.trim()) return
  createKb(newKbName.value.trim(), newKbDesc.value.trim())
  newKbName.value = ''
  newKbDesc.value = ''
  showCreate.value = false
}

async function handleUpload(files: FileList) {
  await uploadMany(files)
  syncFromDocuments(documents.value)
}

function handleRemove(docId: string) {
  if (!confirm('确认删除该文档？关联向量也会被清除。')) return
  removeDoc(docId)
  syncFromDocuments(documents.value)
}

async function handleRetry(docId: string) {
  await retryDoc(docId)
  syncFromDocuments(documents.value)
}

const stats = computed(() => {
  const docs = documents.value
  const ready = docs.filter((d) => d.status === 'ready')
  return {
    total: docs.length,
    ready: ready.length,
    chunks: ready.reduce((s, d) => s + d.chunkCount, 0),
    tokens: ready.reduce((s, d) => s + d.tokenCount, 0)
  }
})
</script>

<template>
  <div class="knowledge-view">
    <!-- 知识库列表 -->
    <aside class="kb-sidebar">
      <div class="kb-head">
        <div class="head-title">知识库</div>
        <button class="btn btn-primary small" @click="showCreate = !showCreate">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          新建
        </button>
      </div>

      <div v-if="showCreate" class="create-form">
        <input
          v-model="newKbName"
          class="kb-input"
          placeholder="知识库名称"
          @keyup.enter="submitCreate"
        />
        <textarea
          v-model="newKbDesc"
          class="kb-input"
          placeholder="描述（可选）"
          rows="2"
        />
        <div class="form-actions">
          <button class="btn btn-ghost small" @click="showCreate = false">取消</button>
          <button class="btn btn-primary small" @click="submitCreate">创建</button>
        </div>
      </div>

      <div class="kb-list">
        <div
          v-for="k in knowledgeBases"
          :key="k.id"
          class="kb-item"
          :class="{ active: k.id === activeId }"
          @click="selectKb(k.id)"
        >
          <div class="kb-item-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z M4 4v12a4 4 0 0 0 4 4"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="kb-item-body">
            <div class="kb-item-name">{{ k.name }}</div>
            <div class="kb-item-meta">
              {{ k.docCount }} 文档 · {{ k.totalChunks }} 块
            </div>
          </div>
          <button
            class="kb-item-del"
            title="删除"
            @click.stop="removeKb(k.id)"
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
              <path
                d="M5 7h14 M9 7V4h6v3 M6 7l1 13h10l1-13"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
        <div v-if="knowledgeBases.length === 0" class="kb-empty">
          暂无知识库
        </div>
      </div>
    </aside>

    <!-- 主内容 -->
    <main class="kb-main">
      <header class="main-head">
        <div class="head-left">
          <h2>{{ activeKnowledgeBase?.name ?? '全部文档' }}</h2>
          <span v-if="activeKnowledgeBase" class="head-meta">
            创建于 {{ formatDate(activeKnowledgeBase.createdAt) }} · {{ activeKnowledgeBase.embeddingModel }}
          </span>
        </div>
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-num">{{ stats.total }}</div>
            <div class="stat-label">总文档</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">{{ stats.ready }}</div>
            <div class="stat-label">已就绪</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">{{ formatNumber(stats.chunks) }}</div>
            <div class="stat-label">文档块</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">{{ formatNumber(stats.tokens) }}</div>
            <div class="stat-label">Tokens</div>
          </div>
        </div>
      </header>

      <div class="main-body">
        <DocumentUpload
          :uploading="uploading"
          @upload="handleUpload"
        />

        <section class="doc-section">
          <div class="section-head">
            <h3>文档列表</h3>
            <span class="section-meta">{{ documents.length }} 个文档</span>
          </div>
          <DocumentList
            :docs="documents"
            :parsing-ids="parsingIds"
            :embedding-ids="embeddingIds"
            @remove="handleRemove"
            @retry="handleRetry"
          />
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.knowledge-view {
  display: flex;
  height: 100%;
  background: var(--color-bg);
}

.kb-sidebar {
  width: 260px;
  flex-shrink: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.kb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  height: var(--header-h);
}

.head-title {
  font-size: 15px;
  font-weight: 600;
}

.btn.small {
  padding: 6px 12px;
  font-size: 12px;
}

.create-form {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-soft);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kb-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  outline: none;
  background: var(--color-surface);
  resize: none;
}

.kb-input:focus {
  border-color: var(--color-primary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.kb-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.kb-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s ease;
}

.kb-item:hover {
  background: var(--color-bg-soft);
}

.kb-item.active {
  background: rgba(79, 124, 255, 0.08);
}

.kb-item-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-soft);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.kb-item.active .kb-item-icon {
  background: var(--grad-primary);
  color: #fff;
}

.kb-item-body {
  flex: 1;
  min-width: 0;
}

.kb-item-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kb-item-meta {
  font-size: 11px;
  color: var(--color-text-3);
  margin-top: 2px;
}

.kb-item-del {
  opacity: 0;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  color: var(--color-text-3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.kb-item:hover .kb-item-del {
  opacity: 1;
}

.kb-item-del:hover {
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-error);
}

.kb-empty {
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-muted);
}

/* 主内容 */
.kb-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.main-head {
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.head-left h2 {
  font-size: 16px;
  font-weight: 600;
}

.head-meta {
  font-size: 12px;
  color: var(--color-text-3);
  margin-left: 12px;
}

.stats-row {
  display: flex;
  gap: 12px;
}

.stat-card {
  text-align: center;
  padding: 6px 14px;
  background: var(--color-surface-2);
  border-radius: var(--radius);
  min-width: 64px;
}

.stat-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-primary);
  font-family: var(--font-mono);
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-3);
  margin-top: 2px;
}

.main-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.doc-section {
  margin-top: 20px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-head h3 {
  font-size: 14px;
  font-weight: 600;
}

.section-meta {
  font-size: 12px;
  color: var(--color-text-3);
}
</style>
