<template>
  <JfDrawer :visible="visible" :title="title" :width="width" @update:visible="emit('update:visible', $event)">
    <div v-if="loading" class="jf-loading">加载中...</div>
    <template v-else-if="task">
      <!-- 发起表单只读回显（instanceExt：bizData + f_* 字段） -->
      <template v-if="bizFields.length">
        <h3 class="jf-section-title">申请信息</h3>
        <div class="jf-biz-grid">
          <div v-for="f in bizFields" :key="f.key" class="jf-biz-item">
            <span class="jf-biz-label">{{ f.label }}</span>
            <span class="jf-biz-value">{{ f.value }}</span>
          </div>
        </div>
      </template>

      <!-- 流程图（上下文定位，含高亮） -->
      <div v-if="task.jsonObject" class="jf-detail-graph">
        <JfFlowViewer :graph-data="task.jsonObject" :high-light="highLight" height="280px" />
      </div>

      <!-- 办理表单（注册表 → __schema__ → tf_ 兜底）。
           注册组件按契约仅传 task；SchemaForm 兜底另传 fieldLabels/readonly -->
      <component
        :is="formComponent"
        v-if="formComponent"
        v-model="formData"
        v-bind="formExtraAttrs"
      />

      <template v-if="!readonly">
        <!-- 审批意见（默认输入，随办理写入 tf_approvalComment） -->
        <div class="jf-form-item">
          <label class="jf-form-label">审批意见</label>
          <textarea v-model="comment" class="jf-input" rows="3" placeholder="请输入审批意见（可选）"></textarea>
        </div>

        <!-- 更多选项：抄送人 / 下一节点处理人 -->
        <details class="jf-more">
          <summary>更多选项（抄送 / 下一节点处理人）</summary>
          <div class="jf-form-item">
            <label class="jf-form-label">办理时抄送（tf_ccActors）</label>
            <JfUserPicker v-model="ccActors" :task-id="taskId" placeholder="搜索并选择抄送人" />
          </div>
          <div class="jf-form-item">
            <label class="jf-form-label">预指派下一节点处理人（tf_nextNodeOperator）</label>
            <JfUserPicker v-model="nextOperators" :task-id="taskId" placeholder="搜索并选择处理人" />
          </div>
        </details>

        <!-- 审批操作 -->
        <div class="jf-approve-actions">
          <button class="jf-btn jf-btn--primary" :disabled="submitting" @click="doExecute(SubmitType.AGREE)">同意</button>
          <button class="jf-btn jf-btn--danger" :disabled="submitting" @click="doExecute(SubmitType.REJECT)">拒绝</button>
          <button class="jf-btn jf-btn--ghost" :disabled="submitting" @click="doExecute(SubmitType.ROLLBACK)">退回上一步</button>
          <button class="jf-btn jf-btn--ghost" :disabled="submitting" @click="doExecute(SubmitType.ROLLBACK_TO_OPERATOR)">退回发起人</button>
          <button
            v-if="isCountersignTask"
            class="jf-btn jf-btn--danger"
            :disabled="submitting"
            @click="doCountersignDisagree"
          >会签拒绝</button>
          <button class="jf-btn jf-btn--ghost" :disabled="submitting" @click="openJump">跳转</button>
          <button class="jf-btn jf-btn--ghost" :disabled="submitting" @click="surrogateVisible = true">转办</button>
          <button class="jf-btn jf-btn--ghost" :disabled="submitting" @click="addCandidateVisible = true">加签</button>
        </div>
      </template>
    </template>
    <div v-else class="jf-empty">任务不存在</div>

    <!-- 跳转节点选择（打开时加载 jumpAbleTaskNameList） -->
    <JfDrawer v-model:visible="jumpVisible" title="跳转到节点" width="420px">
      <div v-if="jumpLoading" class="jf-loading">加载中...</div>
      <div v-else-if="jumpNodes.length" class="jf-list">
        <button v-for="n in jumpNodes" :key="n.value" class="jf-list-item" @click="doJump(n.value)">
          {{ n.label }}
        </button>
      </div>
      <div v-else class="jf-empty">无可跳转节点</div>
    </JfDrawer>

    <!-- 转办/加签（人员选择器） -->
    <JfDrawer :title="surrogateVisible ? '转办（指定处理人）' : '加签（追加参与人）'" :visible="surrogateVisible || addCandidateVisible" width="480px"
      @update:visible="surrogateVisible = $event; addCandidateVisible = $event">
      <div class="jf-form-item">
        <label class="jf-form-label">选择用户</label>
        <JfUserPicker v-model="actorIds" :task-id="taskId" placeholder="搜索姓名/工号" />
      </div>
      <div class="jf-drawer-actions">
        <button class="jf-btn jf-btn--ghost" @click="surrogateVisible = false; addCandidateVisible = false">取消</button>
        <button class="jf-btn jf-btn--primary" :disabled="actorSaving || !actorIds.length" @click="doActors">确定</button>
      </div>
    </JfDrawer>
  </JfDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Component } from 'vue'
import JfDrawer from '../ui/JfDrawer.vue'
import JfFlowViewer from '../ui/JfFlowViewer.vue'
import JfUserPicker from '../ui/JfUserPicker.vue'
import { SchemaForm } from '../form-registry'
import { useJeeflowUi } from '../provider'
import { SubmitType } from '../types'
import type { TaskDetail, JumpableTaskRow, HighLightData } from '../types'

defineOptions({ name: 'JfApproveDrawer' })

const props = withDefaults(defineProps<{
  visible: boolean
  taskId: string | null
  width?: string
  readonly?: boolean
}>(), { width: '820px', readonly: false })

const emit = defineEmits<{
  'update:visible': [v: boolean]
  /** 办理成功后列表刷新 */
  changed: []
}>()

const { api, getForm } = useJeeflowUi()

const loading = ref(false)
const task = ref<TaskDetail | null>(null)
const highLight = ref<HighLightData | null>(null)
const formData = ref<Record<string, any>>({})
const comment = ref('')
const submitting = ref(false)

const jumpVisible = ref(false)
const jumpLoading = ref(false)
const jumpNodes = ref<JumpableTaskRow[]>([])
const surrogateVisible = ref(false)
const addCandidateVisible = ref(false)
const actorIds = ref<string[]>([])
const actorSaving = ref(false)
const ccActors = ref<string[]>([])
const nextOperators = ref<string[]>([])

const title = computed(() => (task.value ? `办理：${task.value.displayName}` : '办理任务'))

/** 会签任务（performType=1）才显示"会签拒绝" */
const isCountersignTask = computed(() => task.value?.performType === 1)

const formKey = computed(() => task.value?.formKey ?? '')
const fieldLabels = computed(() => {
  const labels: Record<string, string> = {}
  for (const f of (task.value?.jsonObject as any)?.__schema__?.fields ?? []) {
    if (f?.key) labels[f.key] = f.label || f.key
  }
  return labels
})

/** 发起表单只读回显：instanceExt（对象）→ instanceVariable（JSON 串）兜底 */
const bizFields = computed<Array<{ key: string; label: string; value: string }>>(() => {
  const t = task.value as any
  if (!t) return []
  let vars: Record<string, any> | null = null
  if (t.instanceExt && typeof t.instanceExt === 'object') vars = t.instanceExt
  else if (typeof t.instanceVariable === 'string') {
    try { vars = JSON.parse(t.instanceVariable) } catch { vars = null }
  }
  if (!vars) return []
  const out: Array<{ key: string; label: string; value: string }> = []
  const biz = vars.bizData
  if (biz && typeof biz === 'object') {
    for (const [k, v] of Object.entries(biz)) {
      if (v == null || v === '') continue
      out.push({ key: `biz_${k}`, label: k, value: String(v) })
    }
  }
  for (const [k, v] of Object.entries(vars)) {
    if (!k.startsWith('f_') || v == null || v === '') continue
    out.push({ key: k, label: k.slice(2), value: String(v) })
  }
  return out
})

const formComponent = computed<Component | null>(() => {
  if (!formKey.value) return null
  const registered = getForm(formKey.value, 'approve')
  if (registered) return registered
  return SchemaForm
})
// 注册组件按契约仅传 task；SchemaForm 兜底传 fieldLabels/readonly（避免 fallthrough 覆盖注册组件内部绑定）
const formExtraAttrs = computed(() =>
  formComponent.value === SchemaForm
    ? { fieldLabels: fieldLabels.value, readonly: props.readonly }
    : { task: task.value })

watch(() => [props.visible, props.taskId] as const, async ([v, id]) => {
  if (!v || !id) return
  loading.value = true
  task.value = null
  highLight.value = null
  formData.value = {}
  comment.value = ''
  actorIds.value = []
  ccActors.value = []
  nextOperators.value = []
  try {
    task.value = await api.processTask.detail(id)
    // 流程高亮（与待办详情一致；失败不阻塞办理）
    try {
      highLight.value = await api.processInstance.highLight(task.value.processInstanceId)
    } catch {
      highLight.value = null
    }
  } finally {
    loading.value = false
  }
}, { immediate: true })

/** 打开跳转抽屉时加载可跳转节点（修复：此前恒为空） */
async function openJump() {
  jumpVisible.value = true
  jumpNodes.value = []
  if (!task.value) return
  jumpLoading.value = true
  try {
    jumpNodes.value = await api.processTask.jumpAbleTaskNameList(task.value.processInstanceId)
  } catch {
    jumpNodes.value = []
  } finally {
    jumpLoading.value = false
  }
}

async function doExecute(submitType: number, extra: Record<string, unknown> = {}) {
  if (!props.taskId) return
  submitting.value = true
  try {
    // tf_ 表单数据 → 任务变量（无前缀自动加 tf_）
    const tf: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(formData.value)) {
      if (v === '' || v == null) continue
      tf[k.startsWith('tf_') ? k : `tf_${k}`] = v
    }
    // 审批意见（默认输入框）
    if (comment.value.trim() && !('tf_approvalComment' in tf)) {
      tf.tf_approvalComment = comment.value.trim()
    }
    // 抄送 / 下一节点预指派
    if (ccActors.value.length) tf.tf_ccActors = ccActors.value
    if (nextOperators.value.length) tf.tf_nextNodeOperator = nextOperators.value
    await api.processTask.execute(props.taskId, submitType as any, { ...tf, ...extra })
    emit('changed')
    emit('update:visible', false)
  } finally {
    submitting.value = false
  }
}

/** 会签拒绝：submitType=20 + countersignDisagreeFlag */
function doCountersignDisagree() {
  return doExecute(SubmitType.COUNTERSIGN_DISAGREE, { countersignDisagreeFlag: true })
}

async function doJump(taskName: string) {
  await doExecute(SubmitType.JUMP, { taskName })
  jumpVisible.value = false
}

async function doActors() {
  if (!props.taskId || !actorIds.value.length) return
  actorSaving.value = true
  try {
    if (surrogateVisible.value) await api.processTask.surrogate(props.taskId, actorIds.value)
    else await api.processTask.addCandidate(props.taskId, actorIds.value)
    surrogateVisible.value = false
    addCandidateVisible.value = false
    actorIds.value = []
    emit('changed')
  } finally {
    actorSaving.value = false
  }
}
</script>

<style scoped>
.jf-approve-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.jf-biz-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px 16px;
  padding: 12px; background: var(--jf-hover-bg, #fafbfc); border-radius: 8px; margin-bottom: 12px;
}
.jf-biz-item { display: flex; flex-direction: column; min-width: 0; }
.jf-biz-label { font-size: 12px; color: #999; }
.jf-biz-value { font-size: 13px; color: var(--jf-text, #1f1f1f); word-break: break-all; }
.jf-more { margin: 8px 0; font-size: 13px; }
.jf-more summary { cursor: pointer; color: var(--jf-primary, #1677ff); user-select: none; }
.jf-more[open] { padding-bottom: 4px; }
textarea.jf-input { resize: vertical; font-family: inherit; }
</style>
