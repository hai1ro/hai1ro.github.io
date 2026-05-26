<script setup lang="ts">
import { data as posts } from '../posts.data.ts'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<template>
  <div class="post-list">
    <div v-if="posts.length === 0" class="empty">
      还没有文章，在 <code>posts/</code> 目录下创建第一篇吧。
    </div>
    <article v-for="post in posts" :key="post.url" class="post-card">
      <header class="post-header">
        <h2 class="post-title">
          <a :href="post.url">{{ post.title }}</a>
        </h2>
        <div class="post-meta">
          <time v-if="post.date" :datetime="post.date" class="post-date">
            📅 {{ formatDate(post.date) }}
          </time>
          <span v-if="post.tags.length" class="post-tags">
            <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
          </span>
        </div>
      </header>
      <p v-if="post.excerpt" class="post-excerpt" v-html="post.excerpt" />
      <a :href="post.url" class="read-more">阅读全文 →</a>
    </article>
  </div>
</template>

<style scoped>
.post-list {
  max-width: 720px;
  margin: 0 auto;
}

.empty {
  text-align: center;
  color: var(--vp-c-text-2);
  padding: 48px 0;
  font-size: 16px;
}

.post-card {
  padding: 28px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.post-card:first-child {
  padding-top: 0;
}

.post-title {
  margin: 0 0 8px;
  font-size: 22px;
  line-height: 1.4;
}

.post-title a {
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: color 0.2s;
}

.post-title a:hover {
  color: var(--vp-c-brand-1);
}

.post-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  margin-bottom: 12px;
}

.post-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 8px;
  font-size: 12px;
  border-radius: 10px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.post-excerpt {
  color: var(--vp-c-text-2);
  line-height: 1.7;
  margin: 0 0 12px;
}

.read-more {
  font-size: 14px;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 500;
}

.read-more:hover {
  text-decoration: underline;
}
</style>
