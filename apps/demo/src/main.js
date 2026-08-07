import { createApp } from 'vue'
import App from './App.vue'
import { createJeeflowUi, JeeflowUiKey } from '@mldong/jeeflow-ui'
import ApplyForm from './forms/apply-form.vue'
import ExpenseForm from './forms/expense-form.vue'

// 创建流程中心上下文（非组件形式注入：注册表在注入前可用，iframe 壳同款用法）
const jeeflowUi = createJeeflowUi({
  baseUrl: localStorage.getItem('jeeflow_backend') || 'http://localhost:8100',
  getOperator: () => localStorage.getItem('jeeflow_user') || 'user1',
  getToken: () => null,
  hasPermission: () => true, // demo 无权限体系：全放行（宿主接入时按 wf:{action} 权限码判断）
})

// 业务表单注册（宿主样板：formKey → 组件）
jeeflowUi.registerForm('apply-form', ApplyForm)
jeeflowUi.registerForm('expense-form', ExpenseForm)

createApp(App)
  .provide(JeeflowUiKey, jeeflowUi)
  .mount('#app')
