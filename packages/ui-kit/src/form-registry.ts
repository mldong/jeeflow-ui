/**
 * 表单注册表（@mldong/jeeflow-ui）
 *
 * 业务表单无法通用——宿主通过 formKey 注册自己的表单组件：
 *
 * ```ts
 * import { useJeeflowUi } from '@mldong/jeeflow-ui'
 * const { registerForm } = useJeeflowUi()
 * registerForm('leave-form', LeaveForm)          // 发起/详情共用
 * registerForm('leave-approve', LeaveApprove)    // 办理页
 * ```
 *
 * 组件约定（props 契约）：
 *  - 发起/详情：modelValue（f_ 表单数据）、defineId、instanceId
 *  - 办理页：额外 task（TaskRow）、submitType 由宿主触发
 * 未注册的 formKey：渲染内置 SchemaForm 兜底（f_ 字段按字段名自动渲染输入框）。
 */

import type { Component, Ref } from 'vue'
import { shallowRef } from 'vue'

export interface FormOptions {
  /** 表单用途：start=发起 / approve=办理 / detail=详情（不传则三种都匹配） */
  scenes?: Array<'start' | 'approve' | 'detail'>
}

export interface FormRegistry {
  register: (formKey: string, component: Component, options?: FormOptions) => void
  get: (formKey: string, scene?: 'start' | 'approve' | 'detail') => Component | null
  has: (formKey: string) => boolean
  keys: () => string[]
}

export function createFormRegistry(): FormRegistry {
  const forms = new Map<string, { component: Component; options?: FormOptions }>()

  function register(formKey: string, component: Component, options?: FormOptions) {
    if (!formKey) throw new Error('registerForm: formKey 不能为空')
    forms.set(formKey, { component, options })
  }

  function get(formKey: string, scene?: 'start' | 'approve' | 'detail'): Component | null {
    const entry = forms.get(formKey)
    if (!entry) return null
    if (scene && entry.options?.scenes && !entry.options.scenes.includes(scene)) return null
    return entry.component
  }

  return { register, get, has: (k) => forms.has(k), keys: () => [...forms.keys()] }
}

// ── 内置 SchemaForm 兜底（阶段 0 骨架：仅按 f_ 字段名渲染输入框）────────────
// 阶段 2 升级为完整 JSON Schema 渲染（types/必填/选择/日期等）

import { defineComponent, h } from 'vue'

export const SchemaForm = defineComponent({
  name: 'JeeflowSchemaForm',
  props: {
    modelValue: { type: Object as () => Record<string, any>, default: () => ({}) },
    /** 字段提示：{ 'f_reason': '事由', 'f_amount': '申请金额' } */
    fieldLabels: { type: Object as () => Record<string, string>, default: () => ({}) },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const form = shallowRef({ ...props.modelValue })
    function set(key: string, val: unknown) {
      form.value[key] = val
      emit('update:modelValue', { ...form.value })
    }
    return () => {
      const labels = props.fieldLabels
      const keys = Object.keys(labels).length ? Object.keys(labels) : Object.keys(props.modelValue)
      return h('div', { class: 'jf-schema-form' },
        keys.map((k) => {
          const label = labels[k] ?? k.replace(/^f_/, '')
          return h('div', { class: 'jf-form-item', key: k }, [
            h('label', { class: 'jf-form-label' }, label),
            h('input', {
              class: 'jf-form-input',
              value: props.modelValue[k] ?? '',
              onInput: (e: Event) => set(k, (e.target as HTMLInputElement).value),
            }),
          ])
        }))
    }
  },
})
