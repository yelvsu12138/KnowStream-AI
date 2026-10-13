<script setup lang="ts">
import { computed } from 'vue'
import type { KnowledgeDoc, DocStatus } from '@/types'
import { formatBytes, formatTime, formatNumber } from '@/utils/helpers'

const props = defineProps<{
  docs: KnowledgeDoc[]
  parsingIds: Set<string>
  embeddingIds: Set<string>
}>()

const emit = defineEmits<{
  (e: 'remove', id: string): void
  (e: 'retry', id: string): void
}>()

const statusMeta: Record<DocStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '待解析', color: '#8993a5', bg: 'rgba(140, 150, 170, 0.12)' },
  parsing: { label: '解析中', color: '#4f7cff', bg: 'rgba(79, 124, 255, 0.12)' },
  embedding: { label: '向量化', color: '#7b3cff', bg: 'rgba(123, 60, 255, 0.12)' },
  ready: { label: '可用', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)' },
  failed: { label: '失败', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' }
}

const sorted = computed(() =>
  [...props.docs].sort((a, b) => b.uploadedAt - a.uploadedAt)
)
</script>

<template>
  <div class="doc-list">
    <div v-if="sorted.length === 0" class="empty">
      <div class="empty-icon">📄</div>
      <div>暂无文档</div>
      <div class="empty-hint">上传文档后将自动解析与向量化</div>
    </div>

    <div v-for="doc in sorted" :key="doc.id" class="doc-row">
      <div class="doc-icon">
        <span class="type-tag">{{ doc.type }}</span>
      </div>
      <div class="doc-info">
        <div class="doc-name" :title="doc.name">{{ doc.name }}</div>
        <div class="doc-meta">
          <span>{{ formatBytes(doc.size) }}</span>
          <span v-if="doc.chunkCount">· {{ formatNumber(doc.chunkCount) }} 块</span>
          <span v-if="doc.tokenCount">· {{ formatNumber(doc.tokenCount) }} tokens</span>
          <span>· {{ formatTime(doc.uploadedAt) }}</span>
        </div>
      </div>

      <div class="doc-progress" v-if="doc.status === 'parsing' || doc.status === 'embedding'">
        <div class="pbar">
          <div class="pfill" :style="{ width: doc.progress + '%' }" />
        </div>
        <span class="pct">{{ doc.progress }}%</span>
      </div>

      <div class="doc-status">
        <span
          class="status-pill"
          :style="{
            color: statusMeta[doc.status].color,
            background: statusMeta[doc.status].bg
          }"
        >
          {{ statusMeta[doc.status].label }}
        </span>
      </div>

      <div class="doc-actions">
        <button
          v-if="doc.status === 'failed'"
          class="btn-icon retry"
          title="重试"
          @click="emit('retry', doc.id)"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
            <path
              d="M4 4v6h6 M20 20v-6h-6 M20 9a8 8 0 0 0-14-3 M4 15a8 8 0 0 0 14 3"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button class="btn-icon remove" title="删除" @click="emit('remove', doc.id)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
            <path
              d="M5 7h14 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <div v-if="doc.error" class="doc-error">{{ doc.error }}</div>
    </div>
  </div>
</template>

<style scoped>
.doc-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.empty {
  text-align: center;
  padding: 32px 12px;
  color: var(--color-text-3);
}

.empty-icon {
  font-size: 28px;
  margin-bottom: 6px;
}

.empty-hint {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.doc-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius);
  transition: all 0.18s ease;
  position: relative;
}

.doc-row:hover {
  border-color: var(--color-border);
  box-shadow: var(--shadow-sm);
}

.doc-icon {
  flex-shrink: 0;
}

.type-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  height: 26px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  background: var(--color-bg-soft);
  color: var(--color-text-2);
  border-radius: 4px;
}

.doc-info {
  flex: 1;
  min-width: 0;
}

.doc-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-meta {
  font-size: 11px;
  color: var(--color-text-3);
  margin-top: 2px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.doc-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 140px;
  flex-shrink: 0;
}

.pbar {
  flex: 1;
  height: 6px;
  background: var(--color-bg-soft);
  border-radius: 3px;
  overflow: hidden;
}

.pfill {
  height: 100%;
  background: var(--grad-primary);
  transition: width 0.4s ease;
}

.pct {
  font-size: 11px;
  color: var(--color-text-3);
  font-family: var(--font-mono);
  width: 32px;
  text-align: right;
}

.doc-status {
  flex-shrink: 0;
  width: 64px;
  text-align: center;
}

.status-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
}

.doc-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.btn-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-3);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-soft);
}

.btn-icon:hover {
  background: var(--color-bg-soft);
  color: var(--color-text);
}

.btn-icon.retry:hover {
  color: var(--color-primary);
}

.btn-icon.remove:hover {
  color: var(--color-error);
  border-color: rgba(239, 68, 68, 0.3);
}

.doc-error {
  position: absolute;
  bottom: -16px;
  left: 50px;
  font-size: 11px;
  color: var(--color-error);
}
</style>
