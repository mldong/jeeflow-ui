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
      </div>

      <!-- 操作（权限码控制显隐） -->
      <div class="jf-detail-actions">
        <button
          v-if="can(['wf:processInstance:withdraw']) && data.state === 10 && activeTaskList.length"
          class="jf-btn jf-btn--ghost"
          @click="withdraw"
        >撤回</button>
        <button
          v-if="can(['wf:processInstance:createCcInstance'])"
          class="jf-btn jf-btn--ghost"
          @click="ccVisible = true"
        >抄送</button>
        <!-- 进行中且为首个任务节点 → 重新提交（submitType=5） -->
        <button
          v-if="reSubmitable"
          class="jf-btn jf-btn--primary"
          @click="reSubmit"
        >重新提交</button>
      </div>

      <!-- 审批记录 -->
      <h3 class="jf-section-title">审批记录</h3>
      <table v-if="records.length" class="jf-table">
        <thead><tr><th>节点</th><th>处理人</th><th>状态</th><th>时间</th></tr></thead>
        <tbody>
          <tr v-for="(r, i) in records" :key="i">
            <td><strong>{{ r.displayName }}</strong></td>
            <td>{{ r.operator || '-' }}</td>
            <td><JfBadge :type="taskStateBadgeType(r.taskState)">{{ taskStateLabel(r.taskState) }}</JfBadge></td>
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
        <label class="jf-form-label">抄送人（逗号分隔 userId）</label>
        <input v-model="ccInput" class="jf-input" placeholder="userA,userB" />
      </div>
      <div class="jf-drawer-actions">
        <button class="jf-btn jf-btn--ghost" @click="ccVisible = false">取消</button>
        <button class="jf-btn jf-btn--primary" :disabled="ccSaving" @click="doCc">确定</button>
      </div>
    </JfDrawer>
  </JfDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import JfDrawer from '../ui/JfDrawer.vue'
import JfBadge from '../ui/JfBadge.vue'
import JfFlowViewer from '../ui/JfFlowViewer.vue'
import { useJeeflowUi } from '../provider'
import { fmtTime, stateLabel, taskStateLabel, taskStateBadgeType } from '../helpers'
import type { InstanceDetail, HighLightData, ApprovalRecordRow } from '../types'

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
const data = ref<InstanceDetail | null>(null)
const records = ref<ApprovalRecordRow[]>([])
const highLight = ref<HighLightData | null>(null)

const ccVisible = ref(false)
const ccInput = ref('')
const ccSaving = ref(false)

const title = computed(() => {
  if (!data.value) return '流程详情'
  return `${data.value.displayName || '流程详情'} · ${stateLabel(data.value.state)}`
})

const activeTaskList = computed(() => data.value?.activeTaskList ?? [])
const reSubmitable = computed(() =>
  Boolean(activeTaskList.value.find((t) => t.ext?.isFirstTaskNode))
)

watch(() => [props.visible, props.instanceId] as const, async ([v, id]) => {
  if (!v || !id) return
  loading.value = true
  data.value = null
  records.value = []
  highLight.value = null
  try {
    const [d, rec, hl] = await Promise.all([
      api.processInstance.detail(id),
      api.processInstance.approvalRecord(id),
      api.processInstance.highLight(id),
    ])
    data.value = d
    records.value = rec
    highLight.value = hl
  } finally {
    loading.value = false
  }
}, { immediate: true })

async function withdraw() {
  if (!props.instanceId) return
  if (!window.confirm('确认撤回该流程？')) return
  await api.processInstance.withdraw(props.instanceId)
  emit('changed')
  await reload()
}

async function reSubmit() {
  const task = activeTaskList.value.find((t) => t.ext?.isFirstTaskNode)
  if (!task) return
  await api.processTask.execute(task.id, 5)
  emit('changed')
  await reload()
}

async function doCc() {
  if (!props.instanceId) return
  const ids = ccInput.value.split(',').map((s) => s.trim()).filter(Boolean)
  if (!ids.length) return
  ccSaving.value = true
  try {
    await api.processInstance.createCCInstance(props.instanceId, ids)
    ccVisible.value = false
    ccInput.value = ''
  } finally {
    ccSaving.value = false
  }
}

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
}
</script>
