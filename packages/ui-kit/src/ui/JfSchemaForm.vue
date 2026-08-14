<template>
  <div class="jf-schema-form">
    <div v-if="!visibleColumns.length" class="jf-muted" style="padding:8px 0">
      {{ emptyHint }}
    </div>
    <div
      v-for="col in visibleColumns"
      :key="col.fieldName"
      class="jf-form-item"
      :style="spanStyle(col)"
    >
      <label class="jf-form-label">
        {{ col.remark || col.fieldName }}
        <span v-if="isRequired(col) && !effectiveReadonly(col)" class="jf-req">*</span>
      </label>
      <textarea
        v-if="isTextarea(col.component)"
        class="jf-input"
        rows="3"
        :disabled="effectiveReadonly(col)"
        :placeholder="placeholderOf(col)"
        :value="String(getVal(col) ?? '')"
        @input="setVal(col, ($event.target as HTMLTextAreaElement).value)"
      />
      <select
        v-else-if="isSelect(col.component)"
        class="jf-input"
        :disabled="effectiveReadonly(col)"
        :value="String(getVal(col) ?? '')"
        @change="setVal(col, ($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ placeholderOf(col) }}</option>
        <option v-for="o in (col.ext?.options || [])" :key="String(o.value)" :value="String(o.value)">{{ o.label }}</option>
      </select>
      <input
        v-else
        class="jf-input"
        :type="nativeType(col.component)"
        :disabled="effectiveReadonly(col)"
        :placeholder="placeholderOf(col)"
        :value="getVal(col) ?? ''"
        @input="onInput(col, $event)"
      />
      <div v-if="errors[col.fieldName]" class="jf-form-error">{{ errors[col.fieldName] }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { SchemaColumn } from '../helpers'
import { FieldPerm, type FieldPermValue } from '../helpers'

defineOptions({ name: 'JeeflowSchemaForm' })

const props = withDefaults(defineProps<{
  modelValue?: Record<string, any>
  schema?: { layout?: string; columns: SchemaColumn[] } | null
  fieldLabels?: Record<string, string>
  permissions?: Record<string, FieldPermValue>
  readonly?: boolean
  fieldPrefix?: string
  emptyHint?: string
}>(), {
  modelValue: () => ({}),
  schema: null,
  fieldLabels: () => ({}),
  permissions: () => ({}),
  readonly: false,
  fieldPrefix: 'f_',
  emptyHint: '未配置表单字段，可直接发起',
})

const emit = defineEmits<{
  'update:modelValue': [v: Record<string, any>]
}>()

const errors = reactive<Record<string, string>>({})

function modelKey(fieldName: string): string {
  if (fieldName.startsWith('f_') || fieldName.startsWith('tf_')) return fieldName
  return `${props.fieldPrefix}${fieldName}`
}

function permOf(col: SchemaColumn): FieldPermValue {
  const k = col.fieldName
  return props.permissions[k]
    ?? props.permissions[modelKey(k)]
    ?? FieldPerm.EDIT
}

function effectiveReadonly(col: SchemaColumn): boolean {
  return props.readonly || permOf(col) === FieldPerm.READ_ONLY
}

function isRequired(col: SchemaColumn): boolean {
  const r = col.ext?.required
  return r === 1 || r === true || r === '1'
}

function isSelect(component: string): boolean {
  const c = (component || '').toLowerCase()
  return c === 'select' || c === 'radio'
}

function isTextarea(component: string): boolean {
  return (component || '').toLowerCase() === 'textarea'
}

function nativeType(component: string): string {
  const c = (component || 'Input').toLowerCase()
  if (c === 'inputnumber' || c === 'number') return 'number'
  if (c === 'datepicker' || c === 'date') return 'date'
  if (c === 'datetimepicker' || c === 'datetime') return 'datetime-local'
  return 'text'
}

function placeholderOf(col: SchemaColumn): string {
  return (col.ext?.placeholder as string) || `请输入${col.remark || col.fieldName}`
}

const fallbackColumns = computed<SchemaColumn[]>(() => {
  const labels = props.fieldLabels
  const keys = Array.from(new Set([
    ...Object.keys(labels),
    ...Object.keys(props.modelValue).filter((k) => {
      const v = props.modelValue[k]
      return v !== '' && v != null && (k.startsWith('f_') || k.startsWith('tf_') || k.startsWith(props.fieldPrefix))
    }),
  ]))
  return keys.map((k) => ({
    fieldName: k.replace(/^f_/, '').replace(/^tf_/, ''),
    remark: labels[k] ?? labels[k.replace(/^f_/, '')] ?? k.replace(/^f_/, '').replace(/^tf_/, ''),
    component: 'Input',
    ext: {},
  }))
})

const columns = computed<SchemaColumn[]>(() => {
  if (props.schema?.columns?.length) return props.schema.columns
  return fallbackColumns.value
})

const visibleColumns = computed(() =>
  columns.value.filter((c) => permOf(c) !== FieldPerm.HIDDEN),
)

function spanStyle(col: SchemaColumn): Record<string, string> {
  const span = Number(col.ext?.span)
  if (!span || span >= 24) return { flex: '1 1 100%' }
  const pct = Math.max(25, Math.round((span / 24) * 100))
  return { flex: `1 1 ${pct}%`, maxWidth: `${pct}%` }
}

function getVal(col: SchemaColumn): unknown {
  const k = modelKey(col.fieldName)
  return props.modelValue[k] ?? props.modelValue[col.fieldName] ?? ''
}

function setVal(col: SchemaColumn, val: unknown) {
  const k = modelKey(col.fieldName)
  emit('update:modelValue', { ...props.modelValue, [k]: val })
  if (errors[col.fieldName]) delete errors[col.fieldName]
}

function onInput(col: SchemaColumn, e: Event) {
  const el = e.target as HTMLInputElement
  setVal(col, el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value)
}

watch(() => props.modelValue, () => {
  for (const k of Object.keys(errors)) delete errors[k]
})

function validate(): string | null {
  for (const k of Object.keys(errors)) delete errors[k]
  for (const col of visibleColumns.value) {
    if (effectiveReadonly(col) || !isRequired(col)) continue
    const v = getVal(col)
    if (v === '' || v == null) {
      const msg = `请填写${col.remark || col.fieldName}`
      errors[col.fieldName] = msg
      return msg
    }
  }
  return null
}

defineExpose({ validate })
</script>
