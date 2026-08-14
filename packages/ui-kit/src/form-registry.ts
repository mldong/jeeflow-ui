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
 * 未注册的 formKey：渲染内置 SchemaForm（__schema__.columns + 组件类型/必填/字段权限）。
 */

import type { Component } from 'vue'

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

// ── 内置 SchemaForm：按 __schema__.columns 渲染（兼容 fields / fieldLabels 回退）
export { default as SchemaForm } from './ui/JfSchemaForm.vue'
