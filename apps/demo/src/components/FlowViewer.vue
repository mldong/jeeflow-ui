<template>
  <div class="flow-viewer" ref="container">
    <div v-if="!ready" class="viewer-loading">加载设计器...</div>
    <FlowDesigner
      v-if="ready && localGraphData"
      :value="localGraphData"
      mode="dingtalk"
      :viewer="true"
      :high-light="highLight"
      :theme="theme"
    />
    <div v-else-if="ready && !localGraphData" class="viewer-empty">无流程图数据</div>
    <!-- issues/12：高亮图例 -->
    <div v-if="hasHighLight" class="viewer-legend">
      <span class="lg"><i class="lg-dot lg-active"></i>进行中</span>
      <span class="lg"><i class="lg-dot lg-history"></i>已完成</span>
      <span class="lg"><i class="lg-dot lg-idle"></i>未激活</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import FlowDesigner from 'mldong-flow-designer-plus'
import 'mldong-flow-designer-plus/lib/style.css'

const props = defineProps({
  graphData: { type: Object, default: null },
  highLight: { type: Object, default: () => ({}) },
})

const ready = ref(false)
const localGraphData = computed(() => props.graphData)
const hasHighLight = computed(() =>
  (props.highLight?.activeNodeNames?.length) || (props.highLight?.historyNodeNames?.length)
)

const theme = {
  primaryColor: '#1677ff',
  edgePrimaryColor: '#1677ff',
  activeColor: '#fa8c16',
  historyColor: '#52c41a',
  backgroundColor: '#fafbfc',
}

onMounted(() => {
  setTimeout(() => ready.value = true, 100)
})
</script>

<style scoped>
.flow-viewer {
  width: 100%;
  height: 100%;
  min-height: 350px;
  position: relative;
}
.viewer-loading, .viewer-empty {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: #999; font-size: 14px;
}
.viewer-legend {
  display: flex; gap: 18px; justify-content: center;
  padding: 8px 0 2px; font-size: 13px; color: #666;
}
.lg { display: inline-flex; align-items: center; gap: 6px; }
.lg-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.lg-active { background: #fa8c16; }
.lg-history { background: #52c41a; }
.lg-idle { background: #d9d9d9; }
</style>
