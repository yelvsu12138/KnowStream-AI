<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  uploading: boolean
}>()

const emit = defineEmits<{
  (e: 'upload', files: FileList): void
}>()

const dragOver = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const supported = ['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xlsx', 'pptx']

function onDragEnter(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  if (e.dataTransfer?.files?.length) {
    emit('upload', e.dataTransfer.files)
  }
}

function onPick() {
  inputRef.value?.click()
}

function onChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) emit('upload', target.files)
  target.value = ''
}

const hint = computed(() => `支持 ${supported.join(' / ')} 文件`)
</script>

<template>
  <div
    class="drop-zone"
    :class="{ 'drag-over': dragOver, 'uploading': props.uploading }"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="onPick"
  >
    <input
      ref="inputRef"
      type="file"
      multiple
      :accept="supported.map((s) => '.' + s).join(',')"
      class="hidden-input"
      @change="onChange"
    />
    <div class="icon">
      <svg v-if="!props.uploading" viewBox="0 0 24 24" width="32" height="32" fill="none">
        <path
          d="M12 16V4 M6 10l6-6 6 6 M4 20h16"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <div v-else class="spinner">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </div>
    </div>
    <div class="title">
      <span v-if="!props.uploading">拖拽文件至此处或点击上传</span>
      <span v-else>正在上传与解析…</span>
    </div>
    <div class="hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: 28px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--color-surface);
}

.drop-zone:hover {
  border-color: var(--color-primary);
  background: rgba(79, 124, 255, 0.03);
}

.drop-zone.drag-over {
  border-color: var(--color-primary);
  background: rgba(79, 124, 255, 0.08);
  transform: scale(1.005);
}

.drop-zone.uploading {
  border-style: solid;
  border-color: var(--color-primary);
  cursor: progress;
  opacity: 0.85;
}

.hidden-input {
  display: none;
}

.icon {
  color: var(--color-text-3);
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
}

.drop-zone:hover .icon {
  color: var(--color-primary);
}

.drop-zone.uploading .icon {
  color: var(--color-primary);
}

.spinner svg {
  animation: spin 1s linear infinite;
}

.title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 4px;
}

.hint {
  font-size: 12px;
  color: var(--color-text-3);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
