<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="page-header">
    <div class="header-accent"></div>
    <div class="header-body">
      <span class="header-icon">{{ icon }}</span>
      <div class="header-text">
        <h1 class="header-title">{{ title }}</h1>
        <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
      </div>
    </div>
  </header>
</template>

<style scoped>
.page-header {
  position: relative;
  max-width: 720px;
  margin: 32px auto 40px;
  padding: 0;
  animation: headerFadeIn 0.5s ease both;
}

/* 左侧色条 — 与 PostList 卡片呼应 */
.header-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--vp-c-brand-1);
  border-radius: 0 2px 2px 0;
  opacity: 0.5;
}

.header-body {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 8px;
}

/* 图标 */
.header-icon {
  font-size: 44px;
  line-height: 1;
  flex-shrink: 0;
  filter: grayscale(0.1);
  animation: iconPulse 2s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

/* 标题文字 */
.header-text {
  min-width: 0;
}

.header-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.3;
  background: linear-gradient(135deg, var(--vp-c-text-1) 0%, var(--vp-c-brand-1) 80%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-subtitle {
  margin: 6px 0 0;
  font-size: 15px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

/* 入场动画 */
@keyframes headerFadeIn {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
