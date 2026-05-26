<script setup lang="ts">
import { data as posts } from '../posts.data.ts'

interface Post {
  title: string
  url: string
  date: string | null
  excerpt?: string
  tags: string[]
  description?: string
}

const typedPosts = posts as Post[]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  // 近 30 天显示相对时间，否则显示完整日期
  if (days < 1) return '今天'
  if (days < 2) return '昨天'
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`

  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

function readingTime(excerpt?: string, description?: string): string {
  const text = (excerpt || description || '').replace(/<[^>]+>/g, '')
  // 中文按字/分钟 ≈ 300，英文按词/分钟 ≈ 200
  const cnChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const enWords = (text.match(/[a-zA-Z]+/g) || []).length
  const minutes = Math.max(1, Math.ceil(cnChars / 300 + enWords / 200))
  return `${minutes} 分钟`
}
</script>

<template>
  <div class="post-list">
    <div v-if="typedPosts.length === 0" class="empty">
      <div class="empty-icon">📝</div>
      <p>还没有文章，在 <code>posts/</code> 目录下创建第一篇吧。</p>
    </div>
    <article
      v-for="(post, index) in typedPosts"
      :key="post.url"
      class="post-card"
      :style="{ animationDelay: `${index * 0.08}s` }"
    >
      <div class="card-accent"></div>
      <div class="card-body">
        <header class="post-header">
          <h2 class="post-title">
            <a :href="post.url">{{ post.title }}</a>
          </h2>
          <div class="post-meta">
            <time v-if="post.date" :datetime="post.date" class="post-date">
              <span class="meta-icon">🗓</span>
              {{ formatDate(post.date) }}
            </time>
            <span class="post-reading-time">
              <span class="meta-icon">☕</span>
              {{ readingTime(post.excerpt, post.description) }}
            </span>
            <span v-if="post.tags.length" class="post-tags">
              <span v-for="tag in post.tags" :key="tag" class="tag">#{{ tag }}</span>
            </span>
          </div>
        </header>
        <p v-if="post.excerpt || post.description" class="post-excerpt">
          <template v-if="post.excerpt" v-html="post.excerpt" />
          <template v-else>{{ post.description }}</template>
        </p>
        <a :href="post.url" class="read-more">
          阅读全文
          <span class="arrow">→</span>
        </a>
      </div>
    </article>
  </div>
</template>

<style scoped>
.post-list {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── 空状态 ── */
.empty {
  text-align: center;
  color: var(--vp-c-text-2);
  padding: 64px 0;
  font-size: 16px;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

/* ── 卡片 ── */
.post-card {
  position: relative;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  overflow: hidden;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
  animation: cardFadeIn 0.5s ease both;
}
.post-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  border-color: var(--vp-c-brand-2);
}

/* 左侧色条 */
.card-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--vp-c-brand-1);
  opacity: 0;
  transition: opacity 0.25s ease;
  border-radius: 0 2px 2px 0;
}
.post-card:hover .card-accent {
  opacity: 1;
}

.card-body {
  padding: 24px 28px;
}

/* ── 标题 ── */
.post-title {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.45;
  letter-spacing: -0.01em;
}
.post-title a {
  color: var(--vp-c-text-1);
  text-decoration: none;
  background: linear-gradient(to right, var(--vp-c-brand-1), var(--vp-c-brand-1)) no-repeat left bottom;
  background-size: 0 2px;
  transition: background-size 0.3s ease, color 0.2s;
  padding-bottom: 2px;
}
.post-title a:hover {
  color: var(--vp-c-brand-1);
  background-size: 100% 2px;
}

/* ── 元信息行 ── */
.post-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: var(--vp-c-text-3);
  margin-bottom: 14px;
}
.meta-icon {
  margin-right: 2px;
  font-size: 12px;
  opacity: 0.6;
}
.post-date,
.post-reading-time {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

/* 标签 */
.post-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 100px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  transition: background 0.2s, color 0.2s;
}
.tag:hover {
  background: var(--vp-c-brand-1);
  color: #fff;
}

/* ── 摘要 ── */
.post-excerpt {
  color: var(--vp-c-text-2);
  line-height: 1.75;
  margin: 0 0 16px;
  font-size: 15px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── 阅读更多 ── */
.read-more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: gap 0.25s ease;
}
.read-more .arrow {
  display: inline-block;
  transition: transform 0.25s ease;
}
.read-more:hover .arrow {
  transform: translateX(4px);
}

/* ── 入场动画 ── */
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
