<template>
  <JfDrawer :visible="visible" :title="title" :width="width" fill @update:visible="emit('update:visible', $event)">
    <div v-if="loading" class="jf-loading">加载中...</div>
    <template v-else-if="task">
      <JfTabs v-model="activeKey" :tabs="tabs">
        <!-- 详情 -->
        <div v-show="activeKey === 'detail'">
          <h3 v-if="parsedSchema || Object.keys(bizFormData).length" class="jf-section-title">申请信息</h3>
          <SchemaForm
            v-if="parsedSchema || Object.keys(bizFormData).length"
            ref="bizFormRef"
            v-model="bizFormData"
            :schema="parsedSchema"
            :field-labels="bizLabels"
            :permissions="permMap"
            :readonly="bizReadonly"
            field-prefix="f_"
          />

          <component
            :is="taskFormComponent"
            v-if="taskFormComponent && !isFirstTaskNode"
            v-model="formData"
            v-bind="taskFormAttrs"
          />

          <template v-if="!readonly && isDoing">
            <template v-if="isFirstTaskNode">
              <JfInitiateExtras
                :graph="graph"
                v-model:cc-actors="ccActors"
                v-model:next-operators="nextOperators"
                v-model:apply-reason="applyReason"
                v-model:attachment="attachment"
              />
              <div class="jf-approve-actions">
                <button class="jf-btn jf-btn--primary" :disabled="submitting" @click="doReApply">重新提交</button>
              </div>
            </template>
            <template v-else>
              <div class="jf-form-item">
                <label class="jf-form-label">审批意见</label>
                <textarea v-model="comment" class="jf-input" rows="3" placeholder="请输入审批意见（可选）"></textarea>
              </div>
              <JfInitiateExtras
                :graph="graph"
                :task-id="taskId"
                v-model:cc-actors="ccActors"
                v-model:next-operators="nextOperators"
              />
              <div class="jf-approve-actions">
                <button v-if="hasBtn('AGREE')" class="jf-btn jf-btn--primary" :disabled="submitting" @click="doExecute(SubmitType.AGREE)">同意</button>
                <button v-if="hasBtn('REJECT')" class="jf-btn jf-btn--danger" :disabled="submitting" @click="doExecute(SubmitType.REJECT)">拒绝</button>
                <button v-if="hasBtn('ROLLBACK')" class="jf-btn jf-btn--ghost" :disabled="submitting" @click="doExecute(SubmitType.ROLLBACK)">退回上一步</button>
                <button v-if="hasBtn('ROLLBACK_TO_OPERATOR')" class="jf-btn jf-btn--ghost" :disabled="submitting" @click="doExecute(SubmitType.ROLLBACK_TO_OPERATOR)">退回发起人</button>
                <button v-if="hasBtn('COUNTERSIGN_DISAGREE')" class="jf-btn jf-btn--danger" :disabled="submitting" @click="doCountersignDisagree">会签拒绝</button>
                <button v-if="hasBtn('JUMP')" class="jf-btn jf-btn--ghost" :disabled="submitting" @click="openJump">跳转</button>
                <button class="jf-btn jf-btn--ghost" :disabled="submitting" @click="surrogateVisible = true">转办</button>
                <button v-if="hasBtn('ADD_CANDIDATE')" class="jf-btn jf-btn--ghost" :disabled="submitting" @click="addCandidateVisible = true">加签</button>
              </div>
            </template>
          </template>
        </div>

        <!-- 流程图 -->
        <div v-show="activeKey === 'flow'">
          <div v-if="graph" class="jf-pane-flow">
            <JfFlowViewer
              :graph-data="graph"
              :high-light="highLight"
              :assignee-text-data="assigneeRows"
              height="100%"
            />
          </div>
          <div v-else class="jf-empty">暂无流程图</div>
        </div>

        <!-- 审批记录 -->
        <div v-show="activeKey === 'record'">
          <JfApprovalRecord :records="records" />
        </div>
      </JfTabs>
    </template>
    <div v-else class="jf-empty">任务不存在</div>

    <JfDrawer v-model:visible="jumpVisible" title="跳转到节点" width="420px">
      <div v-if="jumpLoading" class="jf-loading">加载中...</div>
      <div v-else-if="jumpNodes.length" class="jf-list">
        <button v-for="n in jumpNodes" :key="n.value" class="jf-list-item" @click="doJump(n.value)">
          {{ n.label }}
        </button>
      </div>
      <div v-else class="jf-empty">无可跳转节点</div>
    </JfDrawer>

    <JfDrawer
      :title="surrogateVisible ? '转办（指定处理人）' : '加签（追加参与人）'"
      :visible="surrogateVisible || addCandidateVisible"
      width="480px"
      @update:visible="surrogateVisible = $event; addCandidateVisible = $event"
    >
      <div class="jf-form-item">
        <label class="jf-form-label">选择用户</label>
        <JfUserPicker
          v-model="actorIds"
          :task-id="addCandidateVisible ? taskId : null"
          :scene="addCandidateVisible ? 'candidate' : 'surrogate'"
          placeholder="搜索姓名/工号"
        />
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
import JfTabs from '../ui/JfTabs.vue'
import JfFlowViewer from '../ui/JfFlowViewer.vue'
import JfUserPicker from '../ui/JfUserPicker.vue'
import JfApprovalRecord from '../ui/JfApprovalRecord.vue'
import JfInitiateExtras from '../ui/JfInitiateExtras.vue'
import { SchemaForm } from '../form-registry'
import { useJeeflowUi } from '../provider'
import { SubmitType } from '../types'
import type { TaskDetail, JumpableTaskRow, HighLightData, ApprovalRecordRow, AssigneeTextRow } from '../types'
import {
  parseSchema, buildPermissionMap, findTaskNode, firstTaskNode,
  resolveActionBtns, isBuiltinSchemaFormKey,
  schemaFieldLabels, extractBizFormData, type ActionBtnKey,
} from '../helpers'
import { toast } from '../toast'

defineOptions({ name: 'JfApproveDrawer' })

const props = withDefaults(defineProps<{
  visible: boolean
  taskId: string | null
  width?: string
  readonly?: boolean
}>(), { width: '60%', readonly: false })

const emit = defineEmits<{
  'update:visible': [v: boolean]
  changed: []
}>()

const { api, getForm } = useJeeflowUi()

const loading = ref(false)
const task = ref<TaskDetail | null>(null)
const highLight = ref<HighLightData | null>(null)
const records = ref<ApprovalRecordRow[]>([])
const assigneeRows = ref<AssigneeTextRow[]>([])
const formData = ref<Record<string, any>>({})
const bizFormData = ref<Record<string, any>>({})
const comment = ref('')
const submitting = ref(false)
const activeKey = ref('detail')
const bizFormRef = ref<any>(null)

const jumpVisible = ref(false)
const jumpLoading = ref(false)
const jumpNodes = ref<JumpableTaskRow[]>([])
const surrogateVisible = ref(false)
const addCandidateVisible = ref(false)
const actorIds = ref<string[]>([])
const actorSaving = ref(false)
const ccActors = ref<string[]>([])
const nextOperators = ref<string[]>([])
const applyReason = ref('')
const attachment = ref('')

const tabs = [
  { key: 'detail', label: '详情' },
  { key: 'flow', label: '流程图' },
  { key: 'record', label: '审批记录' },
]

const title = computed(() => (task.value ? `办理：${task.value.displayName}` : '办理任务'))
const graph = computed(() => (task.value?.jsonObject as Record<string, any>) || null)
const isDoing = computed(() => task.value?.taskState === 10)
const isFirstTaskNode = computed(() => {
  const t = task.value as any
  if (t?.ext?.isFirstTaskNode || t?.isFirstTaskNode) return true
  const first = firstTaskNode(graph.value)
  return Boolean(first && (first.id === t?.taskName || first.properties?.name === t?.taskName))
})
const currentTaskNode = computed(() => {
  const t = task.value
  if (!t) return null
  return findTaskNode(graph.value, t.taskName)
    || { properties: { ...(t as any).taskModel, field: (t as any).taskModel?.ext || (t as any).taskModel?.field } }
})
const parsedSchema = computed(() => parseSchema(graph.value))
const permMap = computed(() =>
  buildPermissionMap(graph.value, currentTaskNode.value, parsedSchema.value?.columns))
const bizLabels = computed(() => schemaFieldLabels(graph.value))
const actionBtns = computed(() =>
  resolveActionBtns(currentTaskNode.value, task.value?.performType))
const bizReadonly = computed(() => {
  if (props.readonly || !isDoing.value) return true
  if (isFirstTaskNode.value) return false
  // 启用字段权限时审批节点也可按 PERMISSION_* 编辑
  return !graph.value?.enableFieldPerm
})

function hasBtn(k: ActionBtnKey): boolean {
  return actionBtns.value.includes(k)
}

const taskFormKey = computed(() => task.value?.formKey ?? '')
const taskFormComponent = computed<Component | null>(() => {
  if (!taskFormKey.value || isBuiltinSchemaFormKey(taskFormKey.value)) {
    return parsedSchema.value ? SchemaForm : null
  }
  const registered = getForm(taskFormKey.value, 'approve')
  if (registered) return registered
  return parsedSchema.value ? SchemaForm : null
})
const taskFormAttrs = computed(() =>
  taskFormComponent.value === SchemaForm
    ? {
        schema: parsedSchema.value,
        fieldLabels: bizLabels.value,
        permissions: permMap.value,
        readonly: props.readonly,
        fieldPrefix: 'tf_',
      }
    : { task: task.value })

watch(() => [props.visible, props.taskId] as const, async ([v, id]) => {
  if (!v || !id) return
  loading.value = true
  task.value = null
  highLight.value = null
  records.value = []
  assigneeRows.value = []
  formData.value = {}
  bizFormData.value = {}
  comment.value = ''
  actorIds.value = []
  ccActors.value = []
  nextOperators.value = []
  applyReason.value = ''
  attachment.value = ''
  activeKey.value = 'detail'
  try {
    task.value = await api.processTask.detail(id)
    bizFormData.value = extractBizFormData(task.value)
    const instId = task.value.processInstanceId
    const jobs: Promise<void>[] = [
      api.processInstance.highLight(instId).then((hl) => { highLight.value = hl }).catch(() => { highLight.value = null }),
      api.processInstance.approvalRecord(instId).then((rec) => { records.value = rec }).catch(() => { records.value = [] }),
      api.processInstance.getAssigneeTextData(instId).then((rows) => { assigneeRows.value = rows }).catch(() => { assigneeRows.value = [] }),
    ]
    if (!Object.keys(bizFormData.value).length) {
      jobs.push(
        api.processInstance.detail(instId).then((d) => {
          if (!task.value?.jsonObject && d.jsonObject) {
            (task.value as any).jsonObject = d.jsonObject
          }
          const more = extractBizFormData(d)
          if (Object.keys(more).length) bizFormData.value = more
        }).catch(() => {}),
      )
    }
    await Promise.all(jobs)
  } finally {
    loading.value = false
  }
}, { immediate: true })

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

function collectTf(): Record<string, unknown> {
  const tf: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(formData.value)) {
    if (v === '' || v == null) continue
    tf[k.startsWith('tf_') ? k : `tf_${k}`] = v
  }
  if (comment.value.trim() && !('tf_approvalComment' in tf)) {
    tf.tf_approvalComment = comment.value.trim()
  }
  if (ccActors.value.length) tf.tf_ccActors = ccActors.value
  if (nextOperators.value.length) tf.tf_nextNodeOperator = nextOperators.value
  return tf
}

function collectBiz(): Record<string, unknown> {
  const form: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(bizFormData.value)) {
    if (v === '' || v == null) continue
    form[k.startsWith('f_') ? k : `f_${k}`] = v
  }
  if (ccActors.value.length) form.f_ccActors = ccActors.value
  if (nextOperators.value.length) form.f_nextNodeOperator = nextOperators.value
  if (applyReason.value.trim()) form.f_applyReason = applyReason.value.trim()
  if (attachment.value) form.f_attachment = attachment.value
  return form
}

async function doExecute(submitType: number, extra: Record<string, unknown> = {}) {
  if (!props.taskId) return
  submitting.value = true
  try {
    const extraForm = (!isFirstTaskNode.value && graph.value?.enableFieldPerm) ? collectBiz() : {}
    await api.processTask.execute(props.taskId, submitType as any, { ...collectTf(), ...extraForm, ...extra })
    toast.success('办理成功')
    emit('changed')
    emit('update:visible', false)
  } catch (e) {
    toast.error((e as Error).message || '办理失败')
  } finally {
    submitting.value = false
  }
}

async function doReApply() {
  const err = bizFormRef.value?.validate?.()
  if (err) {
    toast.error(err)
    return
  }
  await doExecute(SubmitType.RE_APPLY, collectBiz())
}

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
