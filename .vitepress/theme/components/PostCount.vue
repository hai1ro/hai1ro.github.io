<script setup lang="ts">
import { data as posts } from '../posts.data.ts'
</script>

<template>
  <span class="post-count">共 {{ posts.length }} 篇文章</span>
</template>

<style scoped>
.post-count {
  display: inline-block;
  padding: 4px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 100px;
}
</style>
