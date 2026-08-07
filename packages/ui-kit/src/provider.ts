/**
 * JeeflowUiProvider（@mldong/jeeflow-ui）
 *
 * Vue 宿主的统一注入入口——与后端门面的 3 个注入点前后端对称：
 *
 * ```
 * <JeeflowUiProvider :config="{
 *   baseUrl: '/api',            // 后端门面地址
 *   getToken: () => store.token, // 登录态
 *   getOperator: () => store.userId,   // 当前用户 → 门面 operator
 *   hasPermission: (codes) => ...      // 权限码 → 按钮显隐
 * }">
 *   <App />
 * </JeeflowUiProvider>
 * ```
 *
 * 提供：api（40 action）/ can（权限码）/ registerForm（表单注册表）。
 * 未使用 Vue 的宿主可直接用 createJeeflowApi（api.ts）。
 */

import { defineComponent, h, inject, provide, reactive } from 'vue'
import type { Component, PropType } from 'vue'
import { createJeeflowApi } from './api'
import type { JeeflowApiConfig, JeeflowApi, JeeflowCan } from './api'
import { createFormRegistry } from './form-registry'
import type { FormRegistry } from './form-registry'

export const JeeflowUiKey = Symbol('jeeflow-ui')

export interface JeeflowUiContext {
  api: JeeflowApi
  can: JeeflowCan
  registerForm: FormRegistry['register']
  getForm: FormRegistry['get']
  config: JeeflowApiConfig
}

export function createJeeflowUi(config: JeeflowApiConfig): JeeflowUiContext {
  const { api, can } = createJeeflowApi(config)
  const registry = createFormRegistry()
  return {
    api, can,
    registerForm: registry.register.bind(registry),
    getForm: registry.get.bind(registry),
    config,
  }
}

export function useJeeflowUi(): JeeflowUiContext {
  const ctx = inject<JeeflowUiContext>(JeeflowUiKey)
  if (!ctx) {
    throw new Error('useJeeflowUi 必须在 <JeeflowUiProvider> 内使用（或先调用 createJeeflowUi）')
  }
  return ctx
}

export const JeeflowUiProvider = defineComponent({
  name: 'JeeflowUiProvider',
  props: {
    config: { type: Object as PropType<JeeflowApiConfig>, required: true },
  },
  setup(props, { slots }) {
    // config 中函数/对象引用变化时重建上下文（reactive 包裹保证响应式）
    const ctx = createJeeflowUi(props.config)
    provide(JeeflowUiKey, ctx)
    return () => slots.default?.()
  },
})

export type { JeeflowApiConfig }
