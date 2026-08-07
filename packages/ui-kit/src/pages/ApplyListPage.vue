<template>
  <div class="jf-page">
    <h2 class="jf-page-title">🚀 发起申请</h2>
    <!-- listByType 分组卡片 -->
    <div v-if="loading" class="jf-loading">加载中...</div>
    <template v-else>
      <div v-for="(items, type) in groups" :key="type" class="jf-card-group">
        <h3 class="jf-group-title">{{ typeTitle(type) }}</h3>
        <div class="jf-card-grid">
          <div v-for="it in items" :key="it.processDesignId" class="jf-card" @click="openStart(it)">
            <div class="jf-card-icon">{{ it.icon || '📄' }}</div>
            <div class="jf-card-name">{{ it.displayName || it.name }}</div>
            <div class="jf-card-remark">{{ it.remark || it.name }}</div>
          </div>
        </div>
        <div v-if="!items.length" class="jf-empty">该类型暂无流程</div>
      </div>
      <div v-if="!Object.keys(groups).length" class="jf-empty">暂无可用流程</div>
    </template>

    <!-- 发起抽屉 -->
    <StartDrawer v-model:visible="startVisible" :define="startDefine" @started="onStarted" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import StartDrawer from '../drawers/StartDrawer.vue'
import { useJeeflowUi } from '../provider'
import type { ListByTypeItem } from '../types'

defineOptions({ name: 'JfApplyListPage' })

const { api } = useJeeflowUi()

const loading = ref(false)
const groups = ref<Record<string, ListByTypeItem[]>>({})

const startVisible = ref(false)
const startDefine = ref<Record<string, any> | null>(null)

const TYPE_TITLES: Record<string, string> = {
  approval: '审批类',
  leave: '请假类',
  expense: '报销类',
  purchase: '采购类',
  other: '其他',
}

function typeTitle(type: string): string {
  return TYPE_TITLES[type] || type || '未分类'
}

async function load() {
  loading.value = true
  try {
    try {
      // 优先：按类型分组（需后端注册扩展仓储）
      groups.value = await api.processDesign.listByType()
    } catch {
      // 回退：无扩展仓储（纯引擎 demo 等）→ 流程定义平铺为"全部流程"一组
      const page = await api.processDefine.page({ pageNum: 1, pageSize: 100 })
      groups.value = {
        全部流程: page.rows.map((d) => ({
          processDesignId: d.id,
          processDefineId: d.id,
          name: d.name,
          displayName: d.displayName,
          icon: '📄',
          remark: `v${d.version}${d.state === 1 ? '' : '（已停用）'}`,
          jsonObject: null,
        })),
      }
    }
  } finally {
    loading.value = false
  }
}

function openStart(item: ListByTypeItem) {
  if (!item.processDefineId) {
    window.alert('该流程尚未发布（processDefineId 为空），无法发起')
    return
  }
  startDefine.value = {
    processDefineId: item.processDefineId,
    name: item.name,
    displayName: item.displayName,
    jsonObject: item.jsonObject,
  }
  startVisible.value = true
}

function onStarted() {
  // 发起成功：刷新（后续可提示）
}

onMounted(load)
</script>
