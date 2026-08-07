<template>
  <JfDrawer :visible="visible" :title="title" :width="width" @update:visible="emit('update:visible', $event)">
    <div v-if="loading" class="jf-loading">加载中...</div>
    <template v-else-if="task">
      <!-- 流程图（上下文定位） -->
      <div v-if="task.jsonObject" class="jf-detail-graph">
        <JfFlowViewer :graph-data="task.jsonObject" height="300px" />
      </div>

      <!-- 办理表单（注册表 → __schema__ → tf_ 兜底） -->
      <component
        :is="formComponent"
        v-if="formComponent"
        v-model="formData"
        :task="task"
        :field-labels="fieldLabels"
        :readonly="readonly"
      />

      <!-- 审批操作 -->
      <div v-if="!readonly" class="jf-approve-actions">
        <button class="jf-btn jf-btn--primary" :disabled="submitting" @click="doExecute(SubmitType.AGREE)">同意</button>
        <button class="jf-btn jf-btn--danger" :disabled="submitting" @click="doExecute(SubmitType.REJECT)">拒绝</button>
        <button class="jf-btn jf-btn--ghost" :disabled="submitting" @click="doExecute(SubmitType.ROLLBACK_TO_OPERATOR)">退回发起人</button>
        <button class="jf-btn jf-btn--ghost" :disabled="submitting" @click="jumpVisible = true">跳转</button>
        <button class="jf-btn jf-btn--ghost" :disabled="submitting" @click="surrogateVisible = true">转办</button>
        <button class="jf-btn jf-btn--ghost" :disabled="submitting" @click="addCandidateVisible = true">加签</button>
      </div>
    </template>
    <div v-else class="jf-empty">任务不存在</div>

    <!-- 跳转节点选择 -->
    <JfDrawer v-model:visible="jumpVisible" title="跳转到节点" width="420px">
      <div v-if="jumpNodes.length" class="jf-list">
        <button v-for="n in jumpNodes" :key="n.value" class="jf-list-item" @click="doJump(n.value)">
          {{ n.label }}
        </button>
      </div>
      <div v-else class="jf-empty">无可跳转节点</div>
    </JfDrawer>

    <!-- 转办/加签 -->
    <JfDrawer :title="surrogateVisible ? '转办（指定处理人）' : '加签（追加参与人）'" :visible="surrogateVisible || addCandidateVisible" width="480px"
      @update:visible="surrogateVisible = $event; addCandidateVisible = $event">
      <div class="jf-form-item">
        <label class="jf-form-label">用户（逗号分隔 userId）</label>
        <input v-model="actorInput" class="jf-input" placeholder="userA,userB" />
      </div>
      <div class="jf-drawer-actions">
        <button class="jf-btn jf-btn--ghost" @click="surrogateVisible = false; addCandidateVisible = false">取消</button>
        <button class="jf-btn jf-btn--primary" :disabled="actorSaving" @click="doActors">确定</button>
      </div>
    </JfDrawer>
  </JfDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Component } from 'vue'
import JfDrawer from '../ui/JfDrawer.vue'
import JfFlowViewer from '../ui/JfFlowViewer.vue'
import { SchemaForm } from '../form-registry'
import { useJeeflowUi } from '../provider'
import { SubmitType } from '../types'
import type { TaskDetail, JumpableTaskRow } from '../types'

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
const formData = ref<Record<string, any>>({})
const submitting = ref(false)

const jumpVisible = ref(false)
const jumpNodes = ref<JumpableTaskRow[]>([])
const surrogateVisible = ref(false)
const addCandidateVisible = ref(false)
const actorInput = ref('')
const actorSaving = ref(false)

const title = computed(() => (task.value ? `办理：${task.value.displayName}` : '办理任务'))

const formKey = computed(() => task.value?.formKey ?? '')
const fieldLabels = computed(() => {
  const labels: Record<string, string> = {}
  for (const f of (task.value?.jsonObject as any)?.__schema__?.fields ?? []) {
    if (f?.key) labels[f.key] = f.label || f.key
  }
  return labels
})

const formComponent = computed<Component | null>(() => {
  if (!formKey.value) return null
  const registered = getForm(formKey.value, 'approve')
  if (registered) return registered
  return SchemaForm
})

watch(() => [props.visible, props.taskId] as const, async ([v, id]) => {
  if (!v || !id) return
  loading.value = true
  task.value = null
  formData.value = {}
  try {
    task.value = await api.processTask.detail(id)
  } finally {
    loading.value = false
  }
}, { immediate: true })

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
    await api.processTask.execute(props.taskId, submitType as any, { ...tf, ...extra })
    emit('changed')
    emit('update:visible', false)
  } finally {
    submitting.value = false
  }
}

async function doJump(taskName: string) {
  await doExecute(SubmitType.JUMP, { taskName })
  jumpVisible.value = false
}

async function doActors() {
  if (!props.taskId) return
  const ids = actorInput.value.split(',').map((s) => s.trim()).filter(Boolean)
  if (!ids.length) return
  actorSaving.value = true
  try {
    if (surrogateVisible.value) await api.processTask.surrogate(props.taskId, ids)
    else await api.processTask.addCandidate(props.taskId, ids)
    surrogateVisible.value = false
    addCandidateVisible.value = false
    actorInput.value = ''
  } finally {
    actorSaving.value = false
  }
}
</script>
