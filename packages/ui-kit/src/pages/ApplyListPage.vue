<template>
  <div class="jf-page">
    <h2 class="jf-page-title"><JfIcon name="apply" :size="18" /> 发起申请</h2>
    <!-- listByType 分组卡片 -->
    <div v-if="loading" class="jf-loading">加载中...</div>
    <template v-else>
      <div v-for="(items, type) in groups" :key="type" class="jf-card-group">
        <h3 class="jf-group-title">{{ typeTitle(type) }}</h3>
        <div class="jf-card-grid">
          <div v-for="it in items" :key="it.processDesignId" class="jf-card" @click="openStart(it)">
            <div class="jf-card-icon"><JfIcon :name="it.icon || 'doc'" :size="26" /></div>
            <div class="jf-card-name">{{ it.displayName || it.name }}</div>
            <div class="jf-card-remark">{{ it.remark || it.name }}</div>
            <!-- 在办徽标：我发起的进行中实例数 + 当前处理人（getAssigneeTextData） -->
            <div v-if="badges[it.processDefineId ?? '']" class="jf-card-badge">
              {{ badges[it.processDefineId ?? ''].count }} 条在办<template v-if="badges[it.processDefineId ?? ''].assignee"> · {{ badges[it.processDefineId ?? ''].assignee }}</template>
            </div>
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
import JfIcon from '../ui/JfIcon.vue'
import { useJeeflowUi } from '../provider'
import { toast } from '../toast'
import type { ListByTypeItem } from '../types'

defineOptions({ name: 'JfApplyListPage' })

const emit = defineEmits<{
  /** 发起成功后宿主跳转（默认建议"我发起的"） */
  goto: [key: string]
}>()

const { api } = useJeeflowUi()

const loading = ref(false)
const groups = ref<Record<string, ListByTypeItem[]>>({})
/** processDefineId → 在办徽标（进行中实例数 + 当前处理人文本） */
const badges = ref<Record<string, { count: number; assignee: string }>>({})

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
      groups.value = {}
    }
    // 过滤停用定义（processDefineState===0，对齐 E2E S10：停用流程不可发起）
    for (const type of Object.keys(groups.value)) {
      groups.value[type] = groups.value[type].filter((it) => it.processDefineState !== 0)
    }
    // 回退：无扩展仓储或 design 表无种子（纯引擎 demo 等）→ 流程定义平铺为"全部流程"一组
    const empty = Object.keys(groups.value).every((t) => !groups.value[t].length)
    if (empty) {
      const page = await api.processDefine.page({ pageNum: 1, pageSize: 100 })
      groups.value = {
        全部流程: page.rows.filter((d) => d.state !== 0).map((d) => ({
          processDesignId: d.id,
          processDefineId: d.id,
          name: d.name,
          displayName: d.displayName,
          icon: 'doc',
          remark: `v${d.version}`,
          processDefineState: d.state,
          jsonObject: null,
        })),
      }
    }
    loadBadges()
  } finally {
    loading.value = false
  }
}

/** 在办徽标：我发起的进行中实例按定义聚合 + 首实例当前处理人 */
async function loadBadges() {
  try {
    const page = await api.processInstance.page({
      pageNum: 1, pageSize: 100, m_EQ_state: 10,
    })
    const byDefine = new Map<string, string[]>()
    for (const i of page.rows) {
      const key = String(i.processDefineId ?? '')
      if (!key) continue
      const arr = byDefine.get(key) ?? []
      arr.push(i.id)
      byDefine.set(key, arr)
    }
    const result: Record<string, { count: number; assignee: string }> = {}
    await Promise.all([...byDefine.entries()].map(async ([defId, instIds]) => {
      let assignee = ''
      try {
        const rows = await api.processInstance.getAssigneeTextData(instIds[0])
        assignee = (rows || []).map((r) => r.label || r.value).filter(Boolean).slice(0, 3).join('、')
      } catch { /* 单实例取人失败不影响徽标计数 */ }
      result[defId] = { count: instIds.length, assignee }
    }))
    badges.value = result
  } catch { /* 徽标为增值信息，失败静默 */ }
}

function openStart(item: ListByTypeItem) {
  if (!item.processDefineId) {
    toast.error('该流程尚未发布（processDefineId 为空），无法发起')
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
  // 发起成功提示已在 StartDrawer（toast）；跳转"我发起的"查看进度
  emit('goto', 'mine')
}

onMounted(load)
</script>

<style scoped>
.jf-card { position: relative; }
.jf-card-badge {
  margin-top: 6px; font-size: 12px; color: var(--jf-warn, #d46b08);
  background: var(--jf-warn-soft, #fff7e6); border-radius: 4px; padding: 2px 6px;
  display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
</style>
