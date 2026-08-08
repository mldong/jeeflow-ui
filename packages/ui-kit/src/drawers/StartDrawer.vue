<template>
  <JfDrawer :visible="visible" :title="title" :width="width" @update:visible="emit('update:visible', $event)">
    <div v-if="loading" class="jf-loading">加载中...</div>
    <template v-else>
      <!-- 表单：注册表优先 → __schema__ → SchemaForm 兜底（formKey 空也可提交纯流程参数）。
           注册组件自带字段定义，不传额外 attrs；仅 SchemaForm 兜底时传 fieldLabels -->
      <component
        :is="formComponent"
        v-if="formComponent"
        v-model="formData"
        v-bind="formExtraAttrs"
        @submit="doStart"
      />

      <!-- 发起选项：抄送人 / 下一节点预指派 -->
      <details class="jf-more">
        <summary>更多选项（抄送 / 下一节点处理人）</summary>
        <div class="jf-form-item">
          <label class="jf-form-label">发起时抄送（f_ccActors）</label>
          <JfUserPicker v-model="ccActors" placeholder="搜索并选择抄送人" />
        </div>
        <div class="jf-form-item">
          <label class="jf-form-label">预指派下一节点处理人（f_nextNodeOperator）</label>
          <JfUserPicker v-model="nextOperators" placeholder="搜索并选择处理人" />
        </div>
      </details>

      <div class="jf-drawer-actions">
        <button class="jf-btn jf-btn--ghost" @click="emit('update:visible', false)">取消</button>
        <button class="jf-btn jf-btn--primary" :disabled="starting" @click="doStart">
          {{ starting ? '发起中...' : '发起' }}
        </button>
      </div>
    </template>
  </JfDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Component } from 'vue'
import JfDrawer from '../ui/JfDrawer.vue'
import JfUserPicker from '../ui/JfUserPicker.vue'
import { SchemaForm } from '../form-registry'
import { useJeeflowUi } from '../provider'
import { firstTaskFormKey } from '../helpers'
import { toast } from '../toast'

defineOptions({ name: 'JfStartDrawer' })

const props = withDefaults(defineProps<{
  visible: boolean
  /** 流程定义（发起对象：processDefineId/name/displayName/jsonObject 至少其一） */
  define?: Record<string, any> | null
  title?: string
  width?: string
}>(), { title: '发起流程', width: '640px' })

const emit = defineEmits<{
  'update:visible': [v: boolean]
  started: [instanceId: string]
}>()

const { api, getForm } = useJeeflowUi()

const loading = ref(false)
const starting = ref(false)
const formKey = ref('')
const formData = ref<Record<string, any>>({})
const fieldLabels = ref<Record<string, string>>({})
const schemaData = ref<Record<string, any> | null>(null)
const ccActors = ref<string[]>([])
const nextOperators = ref<string[]>([])

// 注册表表单优先；无则 SchemaForm 兜底（formKey 空时也渲染，允许纯流程参数发起）
const formComponent = computed<Component | null>(() => {
  if (formKey.value) {
    const registered = getForm(formKey.value, 'start')
    if (registered) return registered
  }
  return SchemaForm
})
// SchemaForm 兜底时传字段标签；注册组件不传（避免 fallthrough 覆盖其内部绑定）
const formExtraAttrs = computed(() =>
  formComponent.value === SchemaForm ? { fieldLabels: fieldLabels.value } : {})

watch(() => props.visible, async (v) => {
  if (!v) return
  formKey.value = ''
  formData.value = {}
  fieldLabels.value = {}
  schemaData.value = null
  ccActors.value = []
  nextOperators.value = []
  if (!props.define) return
  loading.value = true
  try {
    // 取定义详情（jsonObject 定位表单/字段）
    let graph = props.define.jsonObject
    if (!graph && props.define.processDefineId) {
      const d = await api.processDefine.detail(props.define.processDefineId)
      graph = d.jsonObject
    }
    formKey.value = firstTaskFormKey(graph)
    // __schema__ 内嵌（对齐 vben5 schema-wf-form）：jsonObject.__schema__ 或 relTable 元数据
    schemaData.value = graph?.__schema__ ?? null
    // 字段标签：从 __schema__ 提取（key → label）
    const labels: Record<string, string> = {}
    for (const f of (schemaData.value as any)?.fields ?? []) {
      if (f?.key) labels[f.key] = f.label || f.key
    }
    fieldLabels.value = labels
  } finally {
    loading.value = false
  }
}, { immediate: true })

async function doStart() {
  if (!props.define?.processDefineId) {
    toast.error('缺少 processDefineId，无法发起')
    return
  }
  starting.value = true
  try {
    // f_ 前缀字段进流程变量（无前缀的自动加 f_ 前缀，对齐发起参数约定）
    const form: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(formData.value)) {
      if (v === '' || v == null) continue
      form[k.startsWith('f_') ? k : `f_${k}`] = v
    }
    // 抄送 / 下一节点预指派（f_ 前缀）
    if (ccActors.value.length) form.f_ccActors = ccActors.value
    if (nextOperators.value.length) form.f_nextNodeOperator = nextOperators.value
    const r = await api.processDefine.startAndExecute(props.define.processDefineId, form)
    toast.success('发起成功')
    emit('started', r.processInstanceId)
    emit('update:visible', false)
  } catch (e) {
    toast.error((e as Error).message || '发起失败')
  } finally {
    starting.value = false
  }
}
</script>

<style scoped>
.jf-more { margin: 8px 0; font-size: 13px; }
.jf-more summary { cursor: pointer; color: var(--jf-primary, #1677ff); user-select: none; }
.jf-more[open] { padding-bottom: 4px; }
</style>
