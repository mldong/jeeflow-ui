import { createApp } from 'vue'
import App from './App.vue'
import { createJeeflowUi, JeeflowUiKey } from '@mldong/jeeflow-ui'
import ApplyForm from './forms/apply-form.vue'
import ExpenseForm from './forms/expense-form.vue'

// 演示用户（与四后端同一套 8 个具名用户，JfUserPicker 无任务上下文时从此检索）
export const DEMO_USERS = [
  { userId: 'user1', realName: '张三', deptName: '研发部', postName: '工程师' },
  { userId: 'userA', realName: '孙倩', deptName: '研发部', postName: '工程师' },
  { userId: 'userB', realName: '周明', deptName: '研发部', postName: '工程师' },
  { userId: 'userC', realName: '吴婷', deptName: '研发部', postName: '工程师' },
  { userId: 'leader', realName: '李四', deptName: '研发部', postName: '组长' },
  { userId: 'manager', realName: '王五', deptName: '研发部', postName: '经理' },
  { userId: 'director', realName: '赵六', deptName: '研发部', postName: '总监' },
  { userId: 'boss', realName: '钱七', deptName: '研发部', postName: '总经理' },
]

// 创建流程中心上下文（非组件形式注入：注册表在注入前可用，iframe 壳同款用法）
const jeeflowUi = createJeeflowUi({
  // 懒求值：切换后端只改 localStorage，api 每次请求取最新（SPA 热切换，无需 reload）
  baseUrl: () => localStorage.getItem('jeeflow_backend') || 'http://localhost:8100',
  getOperator: () => localStorage.getItem('jeeflow_user') || 'user1',
  getToken: () => null,
  hasPermission: () => true, // demo 无权限体系：全放行（宿主接入时按 wf:{action} 权限码判断）
  // 用户搜索源：转办/抄送/委托等无 taskId 的选人场景（demo 在 8 个用户内检索）
  listUsers: async (keyword) => {
    const kw = (keyword || '').trim().toLowerCase()
    if (!kw) return DEMO_USERS
    return DEMO_USERS.filter((u) =>
      u.userId.toLowerCase().includes(kw) || u.realName.includes(kw))
  },
})

// 业务表单注册（宿主样板：formKey → 组件）
jeeflowUi.registerForm('apply-form', ApplyForm)
jeeflowUi.registerForm('expense-form', ExpenseForm)

createApp(App)
  .provide(JeeflowUiKey, jeeflowUi)
  .mount('#app')
