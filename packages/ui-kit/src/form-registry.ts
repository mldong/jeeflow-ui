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
 *  - 发起/详情：modelValue（f_ 表单数据）、defineId、instanceId；
 *    详情场景额外收到 view：true 只读明细（命中注册组件即渲染，不再依赖 __schema__/f_* 回落）、
 *    false 表示发起人可重新提交（可编辑）。建议实现并 defineExpose({ validate })（返回错误文案或 null）。
 *  - 办理页：额外 task（TaskRow）、submitType 由宿主触发
 * 未注册的 formKey：流程带 __schema__ 时走内置 SchemaForm；否则办理/详情显示"未注册表单 <formKey>"可读提示
 * （不再整段静默消失——演示站此前因此看着像"数据没回显"，实为宿主没注册组件）。
 * 宿主侧目录约定（演示站样板，对齐 vben5-wf）：forms/wf-form/*.vue = 申请级（发起+详情），
 * forms/tf-form/*.vue = 节点级办理表单（字段名带 tf_ 前缀才能与引擎 taskFormData 往返）。
 * ApiDict/ApiSelect 走 adapters.getDict；Upload 走 adapters.upload；未注入则降级。
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
