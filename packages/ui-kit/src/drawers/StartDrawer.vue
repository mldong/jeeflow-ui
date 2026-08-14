<template>
  <JfDrawer :visible="visible" :title="drawerTitle" :width="width" fill @update:visible="emit('update:visible', $event)">
    <div v-if="loading" class="jf-loading">加载中...</div>
    <template v-else>
      <JfTabs v-model="activeKey" :tabs="tabs">
        <div v-show="activeKey === 'form'">
          <component
            :is="formComponent"
            v-if="formComponent"
            ref="formRef"
            v-model="formData"
            v-bind="formExtraAttrs"
            @submit="doStart"
          />
          <JfInitiateExtras
            :graph="graph"
            v-model:cc-actors="ccActors"
            v-model:next-operators="nextOperators"
            v-model:apply-reason="applyReason"
            v-model:attachment="attachment"
          />
          <div class="jf-drawer-actions">
            <button class="jf-btn jf-btn--ghost" @click="emit('update:visible', false)">取消</button>
            <button class="jf-btn jf-btn--primary" :disabled="starting" @click="doStart">
              {{ starting ? '发起中...' : '发起' }}
            </button>
          </div>
        </div>
        <div v-show="activeKey === 'flow'">
          <div v-if="graph" class="jf-pane-flow">
            <JfFlowViewer :graph-data="graph" height="100%" />
          </div>
          <div v-else class="jf-empty">暂无流程图</div>
        </div>
      </JfTabs>
    </template>
  </JfDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Component } from 'vue'
import JfDrawer from '../ui/JfDrawer.vue'
import JfTabs from '../ui/JfTabs.vue'
import JfFlowViewer from '../ui/JfFlowViewer.vue'
import JfInitiateExtras from '../ui/JfInitiateExtras.vue'
import { SchemaForm } from '../form-registry'
import { useJeeflowUi } from '../provider'
import {
  firstTaskFormKey, firstTaskNode, parseSchema, buildPermissionMap,
  isBuiltinSchemaFormKey, schemaFieldLabels,
} from '../helpers'
import { toast } from '../toast'

defineOptions({ name: 'JfStartDrawer' })

const props = withDefaults(defineProps<{
  visible: boolean
  define?: Record<string, any> | null
  title?: string
  width?: string
}>(), { title: '发起流程', width: '60%' })

const emit = defineEmits<{
  'update:visible': [v: boolean]
  started: [instanceId: string]
}>()

const { api, getForm } = useJeeflowUi()

const loading = ref(false)
const starting = ref(false)
const activeKey = ref('form')
const tabs = [
  { key: 'form', label: '表单' },
  { key: 'flow', label: '流程图' },
]
const formKey = ref('')
const formData = ref<Record<string, any>>({})
const graph = ref<Record<string, any> | null>(null)
const formRef = ref<any>(null)
const ccActors = ref<string[]>([])
const nextOperators = ref<string[]>([])
const applyReason = ref('')
const attachment = ref('')

const drawerTitle = computed(() =>
  props.define?.displayName ? `发起：${props.define.displayName}` : props.title)

const parsedSchema = computed(() => parseSchema(graph.value))
const permMap = computed(() => buildPermissionMap(graph.value, firstTaskNode(graph.value), parsedSchema.value?.columns))

const formComponent = computed<Component | null>(() => {
  if (formKey.value && !isBuiltinSchemaFormKey(formKey.value)) {
    const registered = getForm(formKey.value, 'start')
    if (registered) return registered
  }
  return SchemaForm
})

const formExtraAttrs = computed(() => {
  if (formComponent.value !== SchemaForm) return {}
  return {
    schema: parsedSchema.value,
    fieldLabels: schemaFieldLabels(graph.value),
    permissions: permMap.value,
    readonly: false,
    fieldPrefix: 'f_',
  }
})

watch(() => props.visible, async (v) => {
  if (!v) return
  formKey.value = ''
  formData.value = {}
  graph.value = null
  activeKey.value = 'form'
  ccActors.value = []
  nextOperators.value = []
  applyReason.value = ''
  attachment.value = ''
  if (!props.define) return
  loading.value = true
  try {
    let g = props.define.jsonObject
    const defineId = props.define.processDefineId || props.define.id
    if (!g && defineId) {
      const d = await api.processDefine.detail(defineId)
      g = d.jsonObject
    }
    graph.value = g || null
    formKey.value = firstTaskFormKey(g)
  } finally {
    loading.value = false
  }
}, { immediate: true })

async function doStart() {
  const defineId = props.define?.processDefineId || props.define?.id
  if (!defineId) {
    toast.error('缺少 processDefineId，无法发起')
    return
  }
  const err = formRef.value?.validate?.()
  if (err) {
    toast.error(err)
    return
  }
  starting.value = true
  try {
    const form: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(formData.value)) {
      if (v === '' || v == null) continue
      form[k.startsWith('f_') ? k : `f_${k}`] = v
    }
    if (ccActors.value.length) form.f_ccActors = ccActors.value
    if (nextOperators.value.length) form.f_nextNodeOperator = nextOperators.value
    if (applyReason.value.trim()) form.f_applyReason = applyReason.value.trim()
    if (attachment.value) form.f_attachment = attachment.value
    const r = await api.processDefine.startAndExecute(defineId, form)
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
