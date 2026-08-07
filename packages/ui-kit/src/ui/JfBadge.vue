<template>
  <span :class="['jf-badge', `jf-badge--${type}`]"><slot>{{ text }}</slot></span>
</template>

<script setup lang="ts">
defineOptions({ name: 'JfBadge' })

withDefaults(defineProps<{
  text?: string | number
  type?: 'doing' | 'done' | 'reject' | 'info'
}>(), { type: 'info' })
</script>

<style scoped>
.jf-badge {
  display: inline-block; padding: 1px 8px; border-radius: 10px;
  font-size: 12px; line-height: 18px; white-space: nowrap;
}
.jf-badge--doing { background: #fff7e6; color: #d46b08; }
.jf-badge--done { background: #f6ffed; color: #389e0d; }
.jf-badge--reject { background: #fff1f0; color: #cf1322; }
.jf-badge--info { background: #f0f5ff; color: #2f54eb; }
</style>
