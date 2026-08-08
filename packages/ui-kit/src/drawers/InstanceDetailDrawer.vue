<template>
  <JfDrawer :visible="visible" :title="title" :width="width" @update:visible="emit('update:visible', $event)">
    <div v-if="loading" class="jf-loading">加载中...</div>
    <div v-else-if="data" class="jf-detail-body">
      <!-- 流程图：弹性铺满剩余空间，审批记录压缩到底部 -->
      <div v-if="data.jsonObject" class="jf-detail-graph">
        <JfFlowViewer :graph-data="data.jsonObject" :high-light="highLight" />
      </div>
      <div v-else class="jf-empty">暂无流程图</div>

      <!-- 元信息 -->
      <div class="jf-detail-meta">
        <span>发起人: <strong>{{ data.operator || '-' }}</strong></span>
        <span>流水号: <strong>{{ data.businessNo || '-' }}</strong></span>
        <span>时间: <strong>{{ fmtTime(data.createTime) }}</strong></span>
        <!-- 当前处理人（getAssigneeTextData） -->
        <span v-if="assigneeText">当前处理人: <strong>{{ assigneeText }}</strong></span>
      </div>

      <!-- 会签成员进度（nodeProgress：进行中节点逐人展示） -->
      <div v-if="progressNodes.length" class="jf-progress-panel">
        <div v-for="p in progressNodes" :key="p.node" class="jf-progress-block">
          <div class="jf-progress-title">
            {{ p.displayName }}
            <span v-if="p.type" class="jf-muted">（{{ p.type === 'SEQUENTIAL' ? '串行' : p.type === 'PARALLEL' ? '并行' : p.type }}会签）</span>
          </div>
          <div class="jf-progress-members">
            <span
              v-for="m in p.members"
              :key="m.id"
              class="jf-progress-member"
              :class="{ 'jf-progress-member--done': m.done, 'jf-progress-member--active': m.active }"
            >
              {{ m.name || m.id }}{{ m.done ? ' ✓' : '' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 操作（权限码控制显隐） -->
      <div class="jf-detail-actions">
        <button
          v-if="can(['wf:processInstance:withdraw']) && data.state === 10 && activeTaskList.length"
          class="jf-btn jf-btn--ghost"
          :disabled="acting"
          @click="withdraw"
        >撤回</button>
        <button
          v-if="can(['wf:processInstance:createCCInstance'])"
          class="jf-btn jf-btn--ghost"
          @click="ccVisible = true"
        >抄送</button>
        <!-- 进行中且为首个任务节点 → 重新提交（submitType=5） -->
        <button
          v-if="reSubmitable"
          class="jf-btn jf-btn--primary"
          :disabled="acting"
          @click="reSubmit"
        >重新提交</button>
      </div>

      <!-- 审批记录（含意见） -->
      <h3 class="jf-section-title">审批记录</h3>
      <table v-if="records.length" class="jf-table">
        <thead><tr><th>节点</th><th>处理人</th><th>状态</th><th>意见</th><th>时间</th></tr></thead>
        <tbody>
          <tr v-for="(r, i) in records" :key="i">
            <td><strong>{{ r.displayName }}</strong></td>
            <td>{{ r.operator || '-' }}</td>
            <td><JfBadge :type="taskStateBadgeType(r.taskState)">{{ taskStateLabel(r.taskState) }}</JfBadge></td>
            <td class="jf-muted">{{ commentOf(r) }}</td>
            <td class="jf-muted">{{ fmtTime(r.finishTime, true) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="jf-empty">暂无审批记录</div>
    </div>
    <div v-else class="jf-empty">实例不存在</div>

    <!-- 手动抄送弹窗 -->
    <JfDrawer v-model:visible="ccVisible" title="手动抄送" width="480px">
      <div class="jf-form-item">
        <label class="jf-form-label">抄送人</label>
        <JfUserPicker v-model="ccIds" :task-id="null" placeholder="搜索姓名/工号" />
      </div>
      <div class="jf-drawer-actions">
        <button class="jf-btn jf-btn--ghost" @click="ccVisible = false">取消</button>
        <button class="jf-btn jf-btn--primary" :disabled="ccSaving || !ccIds.length" @click="doCc">确定</button>
      </div>
    </JfDrawer>
  </JfDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import JfDrawer from '../ui/JfDrawer.vue'
import JfBadge from '../ui/JfBadge.vue'
import JfFlowViewer from '../ui/JfFlowViewer.vue'
import JfUserPicker from '../ui/JfUserPicker.vue'
import { useJeeflowUi } from '../provider'
import { fmtTime, stateLabel, taskStateLabel, taskStateBadgeType } from '../helpers'
import { toast } from '../toast'
import type { InstanceDetail, HighLightData, ApprovalRecordRow, AssigneeTextRow, NodeProgress } from '../types'

defineOptions({ name: 'JfInstanceDetailDrawer' })

const props = withDefaults(defineProps<{
  visible: boolean
  instanceId: string | null
  width?: string
}>(), { width: '900px' })

const emit = defineEmits<{
  'update:visible': [v: boolean]
  /** 操作后列表刷新 */
  changed: []
}>()

const { api, can } = useJeeflowUi()

const loading = ref(false)
const acting = ref(false)
const data = ref<InstanceDetail | null>(null)
const records = ref<ApprovalRecordRow[]>([])
const highLight = ref<HighLightData | null>(null)
const assigneeRows = ref<AssigneeTextRow[]>([])

const ccVisible = ref(false)
const ccIds = ref<string[]>([])
const ccSaving = ref(false)

const title = computed(() => {
  if (!data.value) return '流程详情'
  return `${data.value.displayName || '流程详情'} · ${stateLabel(data.value.state)}`
})

const activeTaskList = computed(() => data.value?.activeTaskList ?? [])
const reSubmitable = computed(() =>
  Boolean(activeTaskList.value.find((t) => t.ext?.isFirstTaskNode))
)

/** 当前处理人文本（getAssigneeTextData） */
const assigneeText = computed(() =>
  assigneeRows.value.map((r) => r.label || r.value).filter(Boolean).join('、'))

/** 会签成员进度面板：nodeProgress 中仅展示进行中（active 成员存在）的节点 */
const progressNodes = computed(() => {
  const np = highLight.value?.nodeProgress
  if (!np || !data.value) return []
  const out: Array<{ node: string; displayName: string; type?: string; members: NodeProgress['members'] }> = []
  for (const [node, p] of Object.entries(np)) {
    if (!p?.members?.length) continue
    if (!p.members.some((m) => m.active) && p.members.every((m) => m.done)) continue
    const task = data.value.jsonObject?.nodes?.find?.((n: any) => n.id === node)
    out.push({
      node,
      displayName: task?.text?.value || node,
      type: p.type,
      members: p.members,
    })
  }
  return out
})

/** 审批记录意见：variable/ext 中的 tf_approvalComment */
function commentOf(r: ApprovalRecordRow): string {
  const v = (r.variable?.tf_approvalComment ?? r.ext?.tf_approvalComment) as unknown
  return v != null && v !== '' ? String(v) : '-'
}

watch(() => [props.visible, props.instanceId] as const, async ([v, id]) => {
  if (!v || !id) return
  loading.value = true
  data.value = null
  records.value = []
  highLight.value = null
  assigneeRows.value = []
  try {
    await reload()
  } finally {
    loading.value = false
  }
}, { immediate: true })

async function reload() {
  if (!props.instanceId) return
  const [d, rec, hl] = await Promise.all([
    api.processInstance.detail(props.instanceId),
    api.processInstance.approvalRecord(props.instanceId),
    api.processInstance.highLight(props.instanceId),
  ])
  data.value = d
  records.value = rec
  highLight.value = hl
  // 当前处理人（失败不阻塞）
  try {
    assigneeRows.value = await api.processInstance.getAssigneeTextData(props.instanceId)
  } catch {
    assigneeRows.value = []
  }
}

async function withdraw() {
  if (!props.instanceId) return
  if (!window.confirm('确认撤回该流程？')) return
  acting.value = true
  try {
    await api.processInstance.withdraw(props.instanceId)
    toast.success('已撤回')
    emit('changed')
    await reload()
  } catch (e) {
    toast.error(`撤回失败：${(e as Error).message}`)
  } finally {
    acting.value = false
  }
}

async function reSubmit() {
  const task = activeTaskList.value.find((t) => t.ext?.isFirstTaskNode)
  if (!task) return
  acting.value = true
  try {
    await api.processTask.execute(task.id, 5)
    toast.success('已重新提交')
    emit('changed')
    await reload()
  } catch (e) {
    toast.error(`重新提交失败：${(e as Error).message}`)
  } finally {
    acting.value = false
  }
}

async function doCc() {
  if (!props.instanceId || !ccIds.value.length) return
  ccSaving.value = true
  try {
    await api.processInstance.createCCInstance(props.instanceId, ccIds.value)
    toast.success('抄送成功')
    ccVisible.value = false
    ccIds.value = []
  } catch (e) {
    toast.error((e as Error).message || '抄送失败')
  } finally {
    ccSaving.value = false
  }
}
</script>

<style scoped>
.jf-progress-panel {
  border: 1px solid var(--jf-border, #f0f0f0); border-radius: 8px;
  padding: 10px 12px; background: var(--jf-hover-bg, #fafbfc);
  display: flex; flex-direction: column; gap: 8px;
}
.jf-progress-title { font-size: 13px; font-weight: 600; color: var(--jf-text, #1f1f1f); }
.jf-progress-members { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.jf-progress-member {
  padding: 2px 10px; border-radius: 12px; font-size: 12px;
  background: #fff; border: 1px solid var(--jf-border, #e5e5e5); color: #666;
}
.jf-progress-member--active { border-color: var(--jf-primary, #1677ff); color: var(--jf-primary, #1677ff); }
.jf-progress-member--done { background: var(--jf-done-soft, #f6ffed); border-color: #b7eb8f; color: #389e0d; }
</style>
