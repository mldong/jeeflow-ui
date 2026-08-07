<template>
  <div class="jf-flow-viewer" ref="container">
    <div v-if="!ready" class="jf-viewer-loading">加载设计器...</div>
    <FlowDesigner
      v-if="ready && localGraphData"
      :value="localGraphData"
      mode="dingtalk"
      :viewer="true"
      :high-light="highLight"
      :theme="theme"
    />
    <div v-else-if="ready && !localGraphData" class="jf-viewer-empty">无流程图数据</div>
    <!-- 高亮图例 -->
    <div v-if="hasHighLight" class="jf-viewer-legend">
      <span class="lg"><i class="lg-dot lg-active"></i>进行中</span>
      <span class="lg"><i class="lg-dot lg-history"></i>已完成</span>
      <span class="lg"><i class="lg-dot lg-idle"></i>未激活</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import FlowDesigner from 'mldong-flow-designer-plus'
import 'mldong-flow-designer-plus/lib/style.css'
import type { FlowGraph, HighLightData } from '../types'

defineOptions({ name: 'JfFlowViewer' })

const props = withDefaults(defineProps<{
  graphData?: FlowGraph | Record<string, any> | null
  highLight?: HighLightData | Record<string, any> | null
  height?: string
  /** 主题色覆盖（默认蓝） */
  primaryColor?: string
}>(), { primaryColor: '#1677ff' })

const ready = ref(false)
const localGraphData = computed(() => props.graphData)
const hasHighLight = computed(() =>
  Boolean(props.highLight?.activeNodeNames?.length || props.highLight?.historyNodeNames?.length)
)

const theme = computed(() => ({
  primaryColor: props.primaryColor,
  edgePrimaryColor: props.primaryColor,
  activeColor: '#fa8c16',
  historyColor: '#52c41a',
  backgroundColor: '#fafbfc',
}))

onMounted(() => {
  setTimeout(() => (ready.value = true), 100)
})
</script>

<style scoped>
.jf-flow-viewer {
  width: 100%;
  height: v-bind(height);
  min-height: 350px;
  position: relative;
}
.jf-viewer-loading, .jf-viewer-empty {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: #999; font-size: 14px;
}
.jf-viewer-legend {
  display: flex; gap: 18px; justify-content: center;
  padding: 8px 0 2px; font-size: 13px; color: #666;
}
.lg { display: inline-flex; align-items: center; gap: 6px; }
.lg-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.lg-active { background: #fa8c16; }
.lg-history { background: #52c41a; }
.lg-idle { background: #d9d9d9; }
</style>
