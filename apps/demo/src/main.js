import { createApp } from 'vue'
import App from './App.vue'
import { createJeeflowUi, JeeflowUiKey } from '@mldong/jeeflow-ui'
import ApplyForm from './forms/apply-form.vue'
import ExpenseForm from './forms/expense-form.vue'

// 演示用户（与四后端同一套 8 个具名用户）
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

const DEMO_ROLES = [
  { roleId: 'engineer', roleName: '工程师' },
  { roleId: 'leader', roleName: '组长' },
  { roleId: 'manager', roleName: '经理' },
  { roleId: 'director', roleName: '总监' },
]

const DEMO_DICTS = {
  wf_leave_type: [
    { value: 'annual', label: '年假' },
    { value: 'sick', label: '病假' },
    { value: 'personal', label: '事假' },
  ],
  wf_process_type: [
    { value: 'oa', label: 'OA' },
    { value: 'hr', label: '人事' },
    { value: 'finance', label: '财务' },
  ],
}

function filterByKw(list, keyword, keys) {
  const kw = (keyword || '').trim().toLowerCase()
  if (!kw) return list
  return list.filter((row) => keys.some((k) => String(row[k] || '').toLowerCase().includes(kw)))
}

// 创建流程中心上下文（非组件形式注入：注册表在注入前可用，iframe 壳同款用法）
const jeeflowUi = createJeeflowUi({
  // 懒求值：切换后端只改 localStorage，api 每次请求取最新（SPA 热切换，无需 reload）
  // 开发环境走 vite proxy（相对路径）；生产环境走 nginx proxy
  baseUrl: () => localStorage.getItem('jeeflow_backend') || import.meta.env.VITE_BACKEND_JAVA || '/java-api',
  getOperator: () => localStorage.getItem('jeeflow_user') || 'user1',
  getToken: () => null,
  hasPermission: () => true, // demo 无权限体系：全放行（宿主接入时按 wf:{action} 权限码判断）
  adapters: {
    listUsers: async (keyword) => filterByKw(DEMO_USERS, keyword, ['userId', 'realName']),
    getUsersByIds: async (ids) => DEMO_USERS.filter((u) => ids.includes(u.userId)),
    listRoles: async (keyword) => filterByKw(DEMO_ROLES, keyword, ['roleId', 'roleName']),
    getDict: async (code) => DEMO_DICTS[code] || [],
    // demo 无真实存储：返回可识别的占位 path（宿主应上传后回真实 url）
    upload: async (file) => `demo://${file.name}`,
  },
})

// 业务表单注册（宿主样板：formKey → 组件）
jeeflowUi.registerForm('apply-form', ApplyForm)
jeeflowUi.registerForm('expense-form', ExpenseForm)

createApp(App)
  .provide(JeeflowUiKey, jeeflowUi)
  .mount('#app')
