<script setup lang="ts">
import { computed } from 'vue'
import { useSharedKB } from '@/composables/shared'
import ChatPanel from '@/components/chat/ChatPanel.vue'

const kb = useSharedKB()
const knowledgeBaseId = computed(() => kb.activeId.value)
</script>

<template>
  <ChatPanel :knowledge-base-id="knowledgeBaseId" />
</template>
