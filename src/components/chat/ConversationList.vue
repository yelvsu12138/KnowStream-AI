<script setup lang="ts">
import { ref } from 'vue'
import { useSharedChat } from '@/composables/shared'
import type { Conversation } from '@/types'
import { formatTime, truncate } from '@/utils/helpers'

const { conversations, activeId, selectConversation, deleteConversation } =
  useSharedChat()

const editingId = ref<string | null>(null)
const editTitle = ref('')

function startEdit(id: string, title: string) {
  editingId.value = id
  editTitle.value = title
}

function commitEdit() {
  if (editingId.value) {
    const conv = conversations.value.find((c: Conversation) => c.id === editingId.value)
    if (conv) conv.title = editTitle.value.trim() || conv.title
    editingId.value = null
  }
}

function handleDelete(e: Event, id: string) {
  e.stopPropagation()
  if (confirm('删除该对话？消息记录将一并清除。')) {
    deleteConversation(id)
  }
}
</script>

<template>
  <div class="conv-list">
    <div v-if="conversations.length === 0" class="empty">
      <div class="empty-icon">💬</div>
      <div class="empty-text">暂无对话历史</div>
      <div class="empty-hint">在右侧输入问题开始</div>
    </div>

    <div
      v-for="conv in conversations"
      :key="conv.id"
      class="conv-item"
      :class="{ active: conv.id === activeId }"
      @click="selectConversation(conv.id)"
    >
      <div class="conv-main">
        <div v-if="editingId !== conv.id" class="conv-title">
          {{ truncate(conv.title, 22) }}
        </div>
        <input
          v-else
          v-model="editTitle"
          class="conv-edit-input"
          @click.stop
          @keyup.enter="commitEdit"
          @blur="commitEdit"
          @keyup.esc="editingId = null"
        />
        <div class="conv-meta">
          <span>{{ conv.messages.length }} 条</span>
          <span>·</span>
          <span>{{ formatTime(conv.updatedAt) }}</span>
        </div>
      </div>
      <div class="conv-actions" @click.stop>
        <button class="icon-btn" title="重命名" @click="startEdit(conv.id, conv.title)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
            <path
              d="M4 20h4l10-10-4-4L4 16v4z M13.5 6.5l4 4"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button class="icon-btn danger" title="删除" @click="handleDelete($event, conv.id)">
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
    </div>
  </div>
</template>

<style scoped>
.conv-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.empty {
  text-align: center;
  padding: 32px 12px;
  color: #6c7693;
}

.empty-icon {
  font-size: 26px;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 13px;
  color: #8a94b0;
}

.empty-hint {
  font-size: 11px;
  margin-top: 4px;
  color: #5d678a;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s ease;
}

.conv-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.conv-item.active {
  background: rgba(79, 124, 255, 0.18);
}

.conv-main {
  flex: 1;
  min-width: 0;
}

.conv-title {
  font-size: 13px;
  color: #e3e8f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-edit-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 13px;
  outline: none;
}

.conv-meta {
  display: flex;
  gap: 4px;
  font-size: 11px;
  color: #6c7693;
  margin-top: 2px;
}

.conv-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.conv-item:hover .conv-actions {
  opacity: 1;
}

.icon-btn {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #8a94b0;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.icon-btn.danger:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}
</style>
