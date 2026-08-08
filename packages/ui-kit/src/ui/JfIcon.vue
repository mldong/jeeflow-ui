<template>
  <!-- 未知 name 降级为文本（兼容旧 emoji/字符图标） -->
  <svg
    v-if="paths"
    class="jf-icon"
    :style="{ width: `${size}px`, height: `${size}px` }"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
  <span v-else class="jf-icon jf-icon--text">{{ name }}</span>
</template>

<script setup lang="ts">
/**
 * JfIcon（@mldong/jeeflow-ui）
 *
 * 零依赖内联 SVG 图标集（Lucide 风格线性图标，stroke=currentColor）。
 * 传未收录的 name 时降级为纯文本渲染——宿主旧 emoji 图标无需改造也能显示。
 */
import { computed } from 'vue'

defineOptions({ name: 'JfIcon' })

const props = withDefaults(defineProps<{
  /** 图标名（见 ICONS 表）；未知名降级为文本 */
  name: string
  /** 边长 px */
  size?: number
}>(), { size: 16 })

/** 图标路径表（24x24 视窗，多 path 组合） */
const ICONS: Record<string, string[]> = {
  // 工作台
  home: ['M3 11l9-8 9 8', 'M5 9v12h14V9', 'M9 21v-6h6v6'],
  // 发起申请（file-plus）
  apply: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M12 12v6', 'M9 15h6'],
  // 我的待办（clipboard-list）
  todo: ['M8 2h8v4H8z', 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M9 12h6', 'M9 16h6'],
  // 我的已办（check-circle）
  done: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M8.5 12.5l2.5 2.5 5-5'],
  // 我发起的（file-text）
  mine: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M9 13h6', 'M9 17h6'],
  // 我的抄送（send）
  cc: ['M22 2 11 13', 'M22 2 15 22l-4-9-9-4z'],
  // 流程定义（package）
  define: ['M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z', 'M3.3 7l8.7 5 8.7-5', 'M12 22V12'],
  // 流程设计（pen-line）
  design: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
  // 我的委托（repeat）
  surrogate: ['M17 2l4 4-4 4', 'M3 11v-1a4 4 0 0 1 4-4h14', 'M7 22l-4-4 4-4', 'M21 13v1a4 4 0 0 1-4 4H3'],
  // 通用文档（卡片兜底图标）
  doc: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'],
  // 咖啡（空态）
  coffee: ['M17 8h1a4 4 0 1 1 0 8h-1', 'M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z'],
  // 对勾
  check: ['M20 6 9 17l-5-5'],
  // 搜索
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35'],
  // 刷新
  refresh: ['M21 12a9 9 0 1 1-2.64-6.36', 'M21 3v6h-6'],
  // 用户
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
}

const paths = computed(() => ICONS[props.name] ?? null)
</script>

<style scoped>
.jf-icon { flex-shrink: 0; vertical-align: -2px; }
.jf-icon--text { display: inline-flex; align-items: center; justify-content: center; font-style: normal; }
</style>
