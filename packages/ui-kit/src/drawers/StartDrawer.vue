<template>
  <JfDrawer :visible="visible" :title="title" :width="width" @update:visible="emit('update:visible', $event)">
    <div v-if="loading" class="jf-loading">加载中...</div>
    <template v-else>
      <!-- 表单：注册表优先 → __schema__ → f_ 字段兜底。
           只传 v-model：注册组件自带字段定义；fieldLabels 等 attrs 会覆盖注册组件内部绑定，不传 -->
      <component
        :is="formComponent"
        v-if="formComponent"
        v-model="formData"
        @submit="doStart"
      />
      <div v-else class="jf-empty">该流程未注册表单（registerForm('{{ formKey }}', ...)）</div>

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
import { ref, computed, watch, h } from 'vue'
import type { Component } from 'vue'
import JfDrawer from '../ui/JfDrawer.vue'
import { SchemaForm } from '../form-registry'
import { useJeeflowUi } from '../provider'
import { firstTaskFormKey } from '../helpers'

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

// 注册表表单优先；无则 __schema__ 或 f_ 字段走 SchemaForm 兜底
const formComponent = computed<Component | null>(() => {
  if (!formKey.value) return null
  const registered = getForm(formKey.value, 'start')
  if (registered) return registered
  return SchemaForm
})

watch(() => props.visible, async (v) => {
  if (!v) return
  formKey.value = ''
  formData.value = {}
  fieldLabels.value = {}
  schemaData.value = null
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
    window.alert('缺少 processDefineId，无法发起')
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
    const r = await api.processDefine.startAndExecute(props.define.processDefineId, form)
    emit('started', r.processInstanceId)
    emit('update:visible', false)
  } finally {
    starting.value = false
  }
}
</script>
