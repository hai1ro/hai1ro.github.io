<script setup lang="ts">
import { useData } from 'vitepress'

const { site } = useData()
</script>

<template>
  <section class="hero">
    <div class="hero-inner">
      <!-- 头像区域 -->
      <div class="avatar-wrap">
        <div class="avatar">
          <span class="avatar-text">{{ site.title?.charAt(0) || 'H' }}</span>
        </div>
      </div>

      <!-- 标题 -->
      <h1 class="hero-title">{{ site.title }}</h1>
      <p class="hero-desc">{{ site.description }}</p>

      <!-- 分割线 -->
      <div class="hero-divider">
        <span class="divider-dot"></span>
        <span class="divider-line"></span>
        <span class="divider-dot"></span>
      </div>

      <!-- 标签 -->
      <div class="hero-tags">
        <span class="hero-tag">
          <span class="tag-icon">✍️</span> Markdown 写作
        </span>
        <span class="hero-tag">
          <span class="tag-icon">⚡</span> Git Push 自动部署
        </span>
        <span class="hero-tag">
          <span class="tag-icon">🔍</span> 全文搜索
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 64px 24px 40px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

/* 顶部渐变装饰 */
.hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 200px;
  background: radial-gradient(ellipse at center, var(--vp-c-brand-soft) 0%, transparent 70%);
  pointer-events: none;
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 640px;
  margin: 0 auto;
}

/* ── 头像 ── */
.avatar-wrap {
  margin-bottom: 24px;
}
.avatar {
  width: 80px;
  height: 80px;
  margin: 0 auto;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--vp-c-brand-2), var(--vp-c-brand-1));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
  animation: avatarFloat 3s ease-in-out infinite;
}
.avatar-text {
  font-size: 36px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
  user-select: none;
}

@keyframes avatarFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* ── 标题 ── */
.hero-title {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0 0 12px;
  background: linear-gradient(135deg, var(--vp-c-text-1) 0%, var(--vp-c-brand-1) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: 17px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0;
}

/* ── 分割线 ── */
.hero-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 28px 0;
}
.divider-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  opacity: 0.4;
  flex-shrink: 0;
}
.divider-line {
  width: 80px;
  height: 1px;
  background: var(--vp-c-divider);
}

/* ── 特性标签 ── */
.hero-tags {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}
.hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  font-size: 14px;
  border-radius: 100px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  transition: border-color 0.2s, transform 0.2s;
}
.hero-tag:hover {
  border-color: var(--vp-c-brand-2);
  transform: translateY(-1px);
}
.tag-icon {
  font-size: 13px;
}
</style>
