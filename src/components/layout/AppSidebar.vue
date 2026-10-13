<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConversationList from '@/components/chat/ConversationList.vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  { name: 'chat', label: '智能问答', icon: 'M3 5h18v12H3z M3 21h18 M8 21v-4 M16 21v-4' },
  {
    name: 'knowledge',
    label: '知识库',
    icon: 'M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z M4 4v12a4 4 0 0 0 4 4'
  }
]

const activeNav = computed(() => String(route.name))
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-logo">
        <svg viewBox="0 0 32 32" width="24" height="24">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#fff" />
              <stop offset="1" stop-color="#e7d9ff" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="8" fill="url(#lg)" opacity="0.18" />
          <path
            d="M8 20c2-4 6-6 8-6s6 2 8 6"
            stroke="#fff"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
          />
          <circle cx="16" cy="11" r="3" fill="#fff" />
        </svg>
      </div>
      <div class="brand-text">
        <div class="brand-name">KnowStream AI</div>
        <div class="brand-sub">私有文档 RAG 平台</div>
      </div>
    </div>

    <nav class="nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="nav-item"
        :class="{ active: activeNav === item.name }"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <path :d="item.icon" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="sidebar-section">
      <div class="section-title">
        <span>对话历史</span>
        <button class="section-action" title="新建对话" @click="router.push({ name: 'chat' })">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <ConversationList v-show="activeNav === 'chat'" />
      <div v-if="activeNav !== 'chat'" class="empty-hint">
        切换至「智能问答」查看对话历史
      </div>
    </div>

    <div class="sidebar-footer">
      <div class="status-pill">
        <span class="dot" />
        <span>SSE 连接就绪</span>
      </div>
      <div class="version">v1.0.0 · Mock 模式</div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: linear-gradient(180deg, #1a2236 0%, #232b48 100%);
  color: #c9d2e8;
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.brand-logo {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--grad-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(79, 124, 255, 0.4);
}

.brand-name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.2px;
}

.brand-sub {
  font-size: 11px;
  color: #8a94b0;
  margin-top: 2px;
}

.nav {
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius);
  color: #c9d2e8;
  font-size: 14px;
  transition: all 0.18s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.nav-item.active {
  background: rgba(79, 124, 255, 0.18);
  color: #fff;
}

.sidebar-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #6c7693;
}

.section-action {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #8a94b0;
}

.section-action:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.empty-hint {
  font-size: 12px;
  color: #6c7693;
  padding: 12px;
  text-align: center;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8ee5b8;
  background: rgba(22, 163, 74, 0.15);
  padding: 4px 10px;
  border-radius: var(--radius-pill);
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #16c784;
  box-shadow: 0 0 6px #16c784;
}

.version {
  margin-top: 8px;
  font-size: 11px;
  color: #5d678a;
}
</style>
