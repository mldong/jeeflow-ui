<template>
  <JfDrawer :visible="visible" :title="title" :width="width" fill @update:visible="emit('update:visible', $event)">
    <div v-if="loading" class="jf-loading">加载中...</div>
    <template v-else-if="task">
      <JfTabs v-model="activeKey" :tabs="tabs">
        <!-- 详情 -->
        <div v-show="activeKey === 'detail'">
          <!-- 申请信息：命中宿主注册的申请表单优先（与详情抽屉对称），办理表单与之同组件时不重复渲染 -->
          <template v-if="!applyAreaRedundant">
            <h3 class="jf-section-title">申请信息</h3>
            <component
              v-if="bizSource === 'registered' && !bizDataEmpty"
              :is="applyFormComponent"
              ref="bizFormRef"
              v-model="bizFormData"
              :view="bizReadonly"
            />
            <SchemaForm
              v-else-if="bizSource === 'schema' || bizSource === 'data'"
              ref="bizFormRef"
              v-model="bizFormData"
              :schema="parsedSchema"
              :field-labels="bizLabels"
              :permissions="permMap"
              :readonly="bizReadonly"
              field-prefix="f_"
              empty-hint="该流程未配置表单字段，无可回显内容"
            />
            <div v-else class="jf-muted jf-form-hint">{{ bizHint }}</div>
          </template>

          <component
            :is="taskFormComponent"
            v-if="taskFormComponent && !isFirstTaskNode"
            v-model="formData"
            v-bind="taskFormAttrs"
          />
          <div v-else-if="taskFormUnregistered" class="jf-muted jf-form-hint">
            未注册办理表单「{{ taskFormKey }}」，宿主 registerForm 后即可填写
          </div>

          <template v-if="!readonly && isDoing">
            <template v-if="isFirstTaskNode">
              <!-- 退回修改·重提直返：返回节点由引擎钉死，只给只读提示，不给"下一节点处理人" -->
              <div v-if="reapplyTarget" class="jf-reapply-hint">
                重新提交后返回：<strong>{{ reapplyTarget.displayName }}</strong>
              </div>
              <JfInitiateExtras
                :graph="graph"
                :hide-operator="Boolean(reapplyTarget)"
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
                <!-- 征询未收齐：讲明白为什么一排按钮点不动、还差几张（issues/247） -->
                <div v-if="countersignWaiting" class="jf-alert" style="margin-bottom:8px">
                  动态会签意见未收齐（已提交 {{ Number(countersign?.submitted ?? 0) }}/{{ Number(countersign?.total ?? 0) }}），
                  办理动作已置灰；如需继续办理，请先撤回动态会签
                </div>
                <!-- 协办中（issues/253）：协办行办结不驱动流程，主办保留拍板权；wait=true 未齐时办理置灰 -->
                <div v-if="aidantActive" class="jf-alert" style="margin-bottom:8px">
                  协办中（已办结 {{ Number(aidant?.submitted ?? 0) }}/{{ Number(aidant?.total ?? 0) }}）
                  <template v-if="aidantWaiting">；已开启「等协办办结才允许办理」，办理动作已置灰</template>
                  <template v-else>；协办行办结不驱动流程，你仍可随时办理拍板</template>
                </div>
                <textarea v-model="comment" class="jf-input" rows="3" placeholder="请输入审批意见（可选）"></textarea>
              </div>
              <JfInitiateExtras
                :graph="graph"
                :task-id="taskId"
                :add-sign-allowed="allowAddSign"
                v-model:add-sign-checked="addSignChecked"
                v-model:add-sign-operators="addSignOperators"
                v-model:cc-actors="ccActors"
                v-model:next-operators="nextOperators"
              />
              <div class="jf-approve-actions">
                <button v-if="hasBtn('AGREE')" class="jf-btn jf-btn--primary" :disabled="submitting || countersignWaiting || aidantWaiting" @click="doExecute(SubmitType.AGREE)">同意</button>
                <button v-if="hasBtn('REJECT')" class="jf-btn jf-btn--danger" :disabled="submitting || countersignWaiting || aidantWaiting" @click="doExecute(SubmitType.REJECT)">拒绝</button>
                <button v-if="hasBtn('ROLLBACK')" class="jf-btn jf-btn--ghost" :disabled="submitting || countersignWaiting || aidantWaiting" @click="doExecute(SubmitType.ROLLBACK)">退回上一步</button>
                <button v-if="hasBtn('ROLLBACK_TO_OPERATOR')" class="jf-btn jf-btn--ghost" :disabled="submitting || countersignWaiting || aidantWaiting" @click="doExecute(SubmitType.ROLLBACK_TO_OPERATOR)">退回发起人</button>
                <button v-if="hasBtn('COUNTERSIGN_DISAGREE')" class="jf-btn jf-btn--danger" :disabled="submitting || countersignWaiting || aidantWaiting" @click="doCountersignDisagree">会签拒绝</button>
                <button v-if="hasBtn('JUMP')" class="jf-btn jf-btn--ghost" :disabled="submitting || countersignWaiting || aidantWaiting" @click="openJump">跳转</button>
                <button class="jf-btn jf-btn--ghost" :disabled="submitting" @click="transferVisible = true">转办</button>
                <!-- 协办（issues/253）：独立入口，不寄生在办理动作里。权限码复用 execute（规范 06 §2.6 B 案 OR） -->
                <button v-if="can(['wf:processTask:execute'])" class="jf-btn jf-btn--ghost" :disabled="submitting" @click="aidantVisible = true">协办</button>
                <button v-if="hasBtn('ADD_CANDIDATE')" class="jf-btn jf-btn--ghost" :disabled="submitting" @click="addCandidateVisible = true">加签</button>
                <!-- 征询中（无论收齐与否）都给出唯一恢复出口；未收齐时它是这儿唯一能点的 -->
                <button v-if="countersignActive" class="jf-btn jf-btn--danger" :disabled="submitting" @click="doRevokeCountersign">撤回动态会签</button>
              </div>
            </template>
          </template>
          <!-- 只读态（已办入口 / 非 DOING）：审批意见也要回显，不能只留表单 -->
          <div v-else-if="comment" class="jf-form-item">
            <label class="jf-form-label">审批意见</label>
            <div class="jf-detail-text">{{ comment }}</div>
          </div>
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
      title="加签（追加参与人）"
      :visible="addCandidateVisible"
      width="480px"
      @update:visible="addCandidateVisible = $event"
    >
      <div class="jf-form-item">
        <label class="jf-form-label">选择用户</label>
        <JfUserPicker
          v-model="actorIds"
          :task-id="taskId"
          scene="candidate"
          placeholder="搜索姓名/工号"
        />
      </div>
      <div class="jf-drawer-actions">
        <button class="jf-btn jf-btn--ghost" @click="addCandidateVisible = false">取消</button>
        <button class="jf-btn jf-btn--primary" :disabled="actorSaving || !actorIds.length" @click="doActors">确定</button>
      </div>
    </JfDrawer>

    <!-- 转办（issues/115）：摘掉自己＋换上对方，同一任务不新建。与加签语义相反，故独立弹窗＋单选 -->
    <JfDrawer
      title="转办（交给对方办理）"
      :visible="transferVisible"
      width="480px"
      @update:visible="transferVisible = $event"
    >
      <div class="jf-alert" style="margin-bottom:8px">
        转办后这条待办从你的列表移除、由对方办理，你不再参与该任务；只想拉人一起办请用「加签」。
      </div>
      <div class="jf-form-item">
        <label class="jf-form-label">转办给</label>
        <JfUserPicker
          v-model="transferTo"
          single
          scene="surrogate"
          placeholder="搜索姓名/工号"
        />
      </div>
      <div class="jf-form-item">
        <label class="jf-form-label">转办原因（可选）</label>
        <textarea v-model="transferReason" class="jf-input" rows="3" placeholder="请输入转办原因"></textarea>
      </div>
      <div class="jf-drawer-actions">
        <button class="jf-btn jf-btn--ghost" @click="transferVisible = false">取消</button>
        <button class="jf-btn jf-btn--primary" :disabled="transferSaving || transferTo.length !== 1" @click="doTransfer">确定</button>
      </div>
    </JfDrawer>

    <!-- 协办（issues/253）：派生 task_type=1 子行把"活"交出去，主办行保留、拍板权不转移。
         与转办（摘原人换人）/加签（追加参与人）语义不同 ⇒ 独立弹窗＋多选；等不等由 waitCompletion 决定 -->
    <JfDrawer
      title="协办（派生协办任务）"
      :visible="aidantVisible"
      width="480px"
      @update:visible="aidantVisible = $event"
    >
      <div class="jf-alert" style="margin-bottom:8px">
        协办是把这活交给别人干：每人派生一条协办任务，协办行办结不驱动流程，你仍是主办、保留拍板权。
        只想拉人一起办请用「加签」，想把待办整个交出去请用「转办」。
      </div>
      <div class="jf-form-item">
        <label class="jf-form-label">协办人</label>
        <JfUserPicker
          v-model="aidantActors"
          scene="surrogate"
          placeholder="搜索姓名/工号（可多选）"
        />
      </div>
      <div class="jf-form-item">
        <label class="jf-form-label">协办原因（可选）</label>
        <textarea v-model="aidantReason" class="jf-input" rows="3" placeholder="请输入协办原因"></textarea>
      </div>
      <div class="jf-form-item">
        <label class="jf-form-label" style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input v-model="aidantWait" type="checkbox" />
          等协办办结才允许我办理
        </label>
        <div class="jf-muted jf-form-hint">
          缺省关：你可随时办理推进，未办结的协办行随离开节点清场；开启后协办未办结齐时你的办理动作置灰。
        </div>
      </div>
      <div class="jf-drawer-actions">
        <button class="jf-btn jf-btn--ghost" @click="aidantVisible = false">取消</button>
        <button class="jf-btn jf-btn--primary" :disabled="aidantSaving || !aidantActors.length" @click="doAidant">确定</button>
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
  parseSchema, buildPermissionMap, findTaskNode, firstTaskNode, firstTaskFormKey,
  resolveActionBtns, isBuiltinSchemaFormKey, resolveFormSource,
  schemaFieldLabels, extractBizFormData, extractTaskFormData,
  pickReapplyTarget, stripNextOperatorKeys, nodeAllowsAddSign,
  type ActionBtnKey, type FormSource,
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

const { api, getForm, config, can } = useJeeflowUi()

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
const transferVisible = ref(false)
const transferTo = ref<string[]>([])
const transferReason = ref('')
const transferSaving = ref(false)
const addCandidateVisible = ref(false)
const actorIds = ref<string[]>([])
const actorSaving = ref(false)
// 动态协办（issues/253）：独立弹窗，多选协办人＋原因（选填）＋等待开关（缺省关）
const aidantVisible = ref(false)
const aidantActors = ref<string[]>([])
const aidantReason = ref('')
const aidantWait = ref(false)
const aidantSaving = ref(false)
const ccActors = ref<string[]>([])
const nextOperators = ref<string[]>([])
const addSignChecked = ref(false)
const addSignOperators = ref<string[]>([])
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
/**
 * 直返返回目标（退回修改·重提直返）：只读，取自门面投影 reapplyTarget 或任务变量 `_reapplyContext`。
 * 有值时重提走 submitType=5 且不派"下一节点处理人"；无值仍是普通重新提交（申请节点出边）。
 */
const reapplyTarget = computed(() => pickReapplyTarget(task.value, graph.value))
/**
 * 后加签（可重复）显隐闸：当前节点 `properties.allowAddSign` 为真才出现「加签给下一位」组。
 * 读的是抽屉里已载的流程定义 JSON（graph），不依赖后端投影；首节点/直返重提一律不开
 * （规范 02 §4.3 禁止首任务节点配该开关，申请节点的办理是发起/重提语义）。
 */
const allowAddSign = computed(() =>
  !isFirstTaskNode.value && !reapplyTarget.value
  && nodeAllowsAddSign(graph.value, task.value?.taskName))
/**
 * 动态会签（征询模式，issues/247）投影：真身在 `processTask/detail` 出口的
 * `ext.dynamicCountersign = {active, round, total, submitted, actors}`。
 * 未收齐时主办**全部** submitType 动作置灰（owner 拍"全部置灰＋撤回接口"，暂停语义不做），
 * 唯一恢复出口是下面的「撤回动态会签」。
 */
const countersign = computed<Record<string, any> | null>(() => {
  const dc = (task.value as any)?.ext?.dynamicCountersign
  return dc && typeof dc === 'object' ? dc : null
})
const countersignActive = computed(() =>
  !!countersign.value && (countersign.value.active === true || countersign.value.active === 1))
const countersignWaiting = computed(() => {
  if (!countersignActive.value) return false
  return Number(countersign.value?.submitted ?? 0) < Number(countersign.value?.total ?? 0)
})
/**
 * 动态协办（issues/253）投影：真身在 `processTask/detail` 出口的
 * `ext.aidant = {active, round, total, submitted, actors, wait}`（规范 06 §2.7）。
 * 与征询的本质差异：征询强制等收齐，协办**等不等由发起参数 waitCompletion 决定**——
 * 只有 `wait=true` 且未办结齐时才置灰主办办理动作；`wait=false`（缺省）主办可随时拍板推进。
 * 协办行办结不驱动流程，主办行保留 ⇒ 派生成功后任务仍 DOING，只重读投影、不关抽屉。
 */
const aidant = computed<Record<string, any> | null>(() => {
  const ad = (task.value as any)?.ext?.aidant
  return ad && typeof ad === 'object' ? ad : null
})
const aidantActive = computed(() =>
  !!aidant.value && (aidant.value.active === true || aidant.value.active === 1))
const aidantWaiting = computed(() => {
  if (!aidantActive.value) return false
  const wait = aidant.value?.wait
  if (!(wait === true || wait === 1 || wait === '1' || wait === 'true')) return false
  return Number(aidant.value?.submitted ?? 0) < Number(aidant.value?.total ?? 0)
})
// 两组互斥（规范 06 §2.7：tf_addSignOperators 与 tf_nextNodeOperator 同传服务端报错）——
// 勾其一则另一组整组隐藏并清空值；隐藏不等于值消失，提交侧还要再删一次键（见 collectTf）
watch(addSignChecked, (checked) => {
  if (checked && nextOperators.value.length) nextOperators.value = []
})
watch(nextOperators, (list) => {
  if (list.length && (addSignChecked.value || addSignOperators.value.length)) {
    addSignChecked.value = false
    addSignOperators.value = []
  }
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
// 任务表单只渲染宿主注册的审批表单；不再回落 SchemaForm——
// 流程级 __schema__ 已由"申请信息"表单按字段权限渲染，回落会画出一整份绑空数据的重复表单
const taskFormComponent = computed<Component | null>(() => {
  if (!taskFormKey.value || isBuiltinSchemaFormKey(taskFormKey.value)) {
    return null
  }
  return getForm(taskFormKey.value, 'approve') ?? null
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
    // 已办 / 只读入口（对齐 vben5-wf：已办的详情就是办理抽屉）走只读明细，不再渲染可编辑控件
    : { task: task.value, view: props.readonly || !isDoing.value })

/** 申请节点的 formKey 与宿主注册组件——与 InstanceDetailDrawer 同口径（办理抽屉此前缺这一路） */
const applyFormKey = computed(() => firstTaskFormKey(graph.value))
const applyFormComponent = computed<Component | null>(() => {
  const k = applyFormKey.value
  if (!k || isBuiltinSchemaFormKey(k)) return null
  return getForm(k, 'detail') ?? null
})
const bizSource = computed<FormSource>(() =>
  resolveFormSource({
    formKey: applyFormKey.value,
    registered: applyFormComponent.value,
    schema: parsedSchema.value,
    dataCount: Object.keys(bizFormData.value).length,
  }))
/** 办理节点复用的就是申请表单本身（如"含驳回流程"task1 的 formKey=apply-form）且无申请数据可展示：
 *  下面那份可编辑表单已覆盖，不再画一份空的重复表单（dd130fa 的病灶） */
const applyAreaRedundant = computed(() =>
  Boolean(taskFormComponent.value)
  && taskFormComponent.value === applyFormComponent.value
  && !Object.keys(bizFormData.value).length)
/** 命中注册组件但没有 f_* 数据、又不是可编辑态：铺一串 "-" 会被读成"没回显"，改给一行说明 */
const bizDataEmpty = computed(() => !Object.keys(bizFormData.value).length && bizReadonly.value)
const bizHint = computed(() => {
  if (bizSource.value === 'unregistered') return `未注册申请表单「${applyFormKey.value}」，宿主 registerForm 后即可回显`
  if (bizDataEmpty.value) return '该实例发起时未填写业务表单字段（无 f_* 数据）'
  return '该流程未配置申请表单（节点属性 form 为空）'
})
/** 有 formKey 但宿主未注册 approve 表单：给可读提示，不再静默空白 */
const taskFormUnregistered = computed(() =>
  !isFirstTaskNode.value && Boolean(taskFormKey.value) && !taskFormComponent.value
  && !isBuiltinSchemaFormKey(taskFormKey.value))

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
  aidantActors.value = []
  aidantReason.value = ''
  aidantWait.value = false
  ccActors.value = []
  nextOperators.value = []
  addSignChecked.value = false
  addSignOperators.value = []
  applyReason.value = ''
  attachment.value = ''
  activeKey.value = 'detail'
  try {
    task.value = await api.processTask.detail(id)
    // 任务级表单回显：引擎在 taskFormData 里给审批人上一轮填过的 tf_*（vben5-wf 同口径，此前零消费）
    const tf = extractTaskFormData(task.value)
    formData.value = tf
    comment.value = String(tf.tf_approvalComment ?? '')
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
  // 「加签给下一位」与「指定下一节点处理人」互斥（规范 06 §2.7，服务端同传报错是权威兜底）：
  // 未启用那一组的键一律删掉——整组隐藏不等于值消失，回显与残留都可能把它带进 payload
  if (allowAddSign.value && addSignChecked.value) {
    if (addSignOperators.value.length) tf.tf_addSignOperators = addSignOperators.value
    delete tf.tf_nextNodeOperator
  } else {
    if (nextOperators.value.length) tf.tf_nextNodeOperator = nextOperators.value
    delete tf.tf_addSignOperators
  }
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

async function doExecute(
  submitType: number,
  extra: Record<string, unknown> = {},
  options: { omitNextOperator?: boolean } = {},
) {
  if (!props.taskId) return
  submitting.value = true
  try {
    const extraForm = (!isFirstTaskNode.value && graph.value?.enableFieldPerm) ? collectBiz() : {}
    const payload: Record<string, unknown> = { ...collectTf(), ...extraForm, ...extra }
    // 直返重提：下一节点由引擎钉死，operator 覆写参数一个都不发（服务端本就忽略）
    if (options.omitNextOperator) stripNextOperatorKeys(payload)
    await api.processTask.execute(props.taskId, submitType as any, payload)
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
  // submitType=5 恒定；是否剥 operator 取决于本待办有没有直返目标
  await doExecute(SubmitType.RE_APPLY, collectBiz(), { omitNextOperator: Boolean(reapplyTarget.value) })
}

function doCountersignDisagree() {
  return doExecute(SubmitType.COUNTERSIGN_DISAGREE, { countersignDisagreeFlag: true })
}

/** 撤回动态会签（issues/247）：清掉未交意见的成员行，闸门恢复。任务没办结 ⇒ 只重读投影，不关抽屉 */
async function doRevokeCountersign() {
  if (!props.taskId) return
  if (!window.confirm('撤回后未交意见的成员行会被清场（已交意见保留），确定撤回本轮动态会签吗？')) return
  submitting.value = true
  try {
    await api.processTask.revokeDynamicCountersign(props.taskId, '主办收回征询')
    toast.success('已撤回动态会签')
    task.value = await api.processTask.detail(props.taskId)
    const instId = task.value?.processInstanceId
    if (instId) records.value = await api.processInstance.approvalRecord(instId).catch(() => records.value)
    emit('changed')
  } catch (e) {
    toast.error((e as Error).message || '撤回失败')
  } finally {
    submitting.value = false
  }
}

async function doJump(taskName: string) {
  await doExecute(SubmitType.JUMP, { taskName })
  jumpVisible.value = false
}

async function doActors() {
  if (!props.taskId || !actorIds.value.length) return
  actorSaving.value = true
  try {
    await api.processTask.addCandidate(props.taskId, actorIds.value)
    addCandidateVisible.value = false
    actorIds.value = []
    emit('changed')
  } catch (e) {
    toast.error((e as Error).message || '加签失败')
  } finally {
    actorSaving.value = false
  }
}

/**
 * 转办（issues/115）：fromActor 恒为当前登录人（引擎判 operator == fromActor，
 * 转别人的待办会被拒），toActor 单选。成功后待办已不在我名下 ⇒ 关抽屉，与办理成功同路。
 */
async function doTransfer() {
  if (!props.taskId || transferTo.value.length !== 1) return
  transferSaving.value = true
  try {
    await api.processTask.transfer(
      props.taskId, config.getOperator(), transferTo.value[0],
      transferReason.value.trim() || undefined,
    )
    toast.success('已转办')
    transferVisible.value = false
    transferTo.value = []
    transferReason.value = ''
    emit('changed')
    emit('update:visible', false)
  } catch (e) {
    toast.error((e as Error).message || '转办失败')
  } finally {
    transferSaving.value = false
  }
}

/**
 * 动态协办（issues/253）：派生协办子行，主办行原样保留、任务仍 DOING
 * ⇒ 照征询撤回那路只重读详情/投影刷新，**不关办理抽屉**（关抽屉是"办结/转办"才走的路）。
 * operator 由 api.flow 自动注入（config.getOperator），与 transfer/recall 同口径。
 */
async function doAidant() {
  if (!props.taskId || !aidantActors.value.length) return
  aidantSaving.value = true
  try {
    await api.processTask.aidant(
      props.taskId, aidantActors.value,
      aidantReason.value.trim() || undefined,
      aidantWait.value,
    )
    toast.success('已派生协办任务')
    aidantVisible.value = false
    aidantActors.value = []
    aidantReason.value = ''
    aidantWait.value = false
    task.value = await api.processTask.detail(props.taskId)
    const instId = task.value?.processInstanceId
    if (instId) records.value = await api.processInstance.approvalRecord(instId).catch(() => records.value)
    emit('changed')
  } catch (e) {
    toast.error((e as Error).message || '协办失败')
  } finally {
    aidantSaving.value = false
  }
}
</script>
