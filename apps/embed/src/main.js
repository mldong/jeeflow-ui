import { createApp } from 'vue'
import { reactive } from 'vue'
import App from './App.vue'
import { createJeeflowUi, JeeflowUiKey } from '@mldong/jeeflow-ui'

/**
 * jeeflow embed 壳——异栈系统（若依等）iframe 即插即用样板
 *
 * 注入通道（双通道，postMessage 可覆盖 URL）：
 *  1. URL 参数：?token=&backend=&operator=&theme=&site=&logo=
 *  2. 宿主 postMessage：{ type:'jeeflow:init', token?, backend?, operator?,
 *                        theme?: { primary?, siteName?, logo? } }
 *
 * 上报协议（embed → 宿主）：
 *  { type:'jeeflow:ready' }                          壳挂载完成
 *  { type:'jeeflow:event', event, action, operator } 办理完成/发起/撤回
 *  { type:'jeeflow:todo-count', count }              待办数（首取 + 15s 轮询，变化即报）
 */

// ── 白标/登录态状态（postMessage 热更新）──
const params = new URLSearchParams(location.search)
const store = reactive({
  token: params.get('token') || '',
  backend: params.get('backend') || 'http://localhost:8100',
  operator: params.get('operator') || 'user1',
  siteName: params.get('site') || 'jeeflow 流程中心',
  logo: params.get('logo') || '',
  primary: params.get('theme') || '',
})

function applyTheme() {
  if (store.primary) {
    document.documentElement.style.setProperty('--jf-primary', store.primary)
  }
  document.title = store.siteName
}
applyTheme()

// ── 上报宿主 ──
function notifyHost(msg) {
  window.parent.postMessage(msg, '*')
}

/** 需上报事件的门面 action → 事件名 */
const EVENT_ACTIONS = {
  'processTask/execute': 'task-done',
  'processInstance/startAndExecute': 'task-started',
  'processInstance/withdraw': 'task-withdrawn',
}

// fetch 包装：关键 action 成功后向宿主上报（不改 ui-kit 内部）
const fetchImpl = async (url, opts) => {
  const resp = await fetch(url, opts)
  try {
    const m = /\/wf\/([\w/]+)$/.exec(String(url))
    const event = m && EVENT_ACTIONS[m[1]]
    if (event && resp.ok) {
      const clone = resp.clone()
      clone.json().then((r) => {
        if (r && r.code === 0) {
          notifyHost({ type: 'jeeflow:event', event, action: m[1], operator: store.operator })
          pollTodoCount(true)
        }
      }).catch(() => {})
    }
  } catch { /* 上报为增值能力，失败静默 */ }
  return resp
}

// 演示用户（与四后端同一套 8 个具名用户；宿主接入时可改由 postMessage 注入用户源）
const EMBED_USERS = [
  { userId: 'user1', realName: '张三', deptName: '研发部', postName: '工程师' },
  { userId: 'userA', realName: '孙倩', deptName: '研发部', postName: '工程师' },
  { userId: 'userB', realName: '周明', deptName: '研发部', postName: '工程师' },
  { userId: 'userC', realName: '吴婷', deptName: '研发部', postName: '工程师' },
  { userId: 'leader', realName: '李四', deptName: '研发部', postName: '组长' },
  { userId: 'manager', realName: '王五', deptName: '研发部', postName: '经理' },
  { userId: 'director', realName: '赵六', deptName: '研发部', postName: '总监' },
  { userId: 'boss', realName: '钱七', deptName: '研发部', postName: '总经理' },
]

const jeeflowUi = createJeeflowUi({
  baseUrl: () => store.backend,
  getOperator: () => store.operator,
  getToken: () => store.token || null,
  hasPermission: () => true,
  listUsers: async (keyword) => {
    const kw = (keyword || '').trim().toLowerCase()
    if (!kw) return EMBED_USERS
    return EMBED_USERS.filter((u) =>
      u.userId.toLowerCase().includes(kw) || u.realName.includes(kw))
  },
  fetchImpl,
})

// ── 宿主 postMessage 注入（init 全量 / setOperator 局部）──
window.addEventListener('message', (e) => {
  const d = e.data
  if (!d || typeof d !== 'object') return
  if (d.type === 'jeeflow:init') {
    if (d.token != null) store.token = d.token
    if (d.backend) store.backend = d.backend
    if (d.operator) store.operator = d.operator
    if (d.theme) {
      if (d.theme.primary) store.primary = d.theme.primary
      if (d.theme.siteName) store.siteName = d.theme.siteName
      if (d.theme.logo != null) store.logo = d.theme.logo
    }
    applyTheme()
    pollTodoCount(true)
  } else if (d.type === 'jeeflow:setOperator' && d.operator) {
    store.operator = d.operator
    pollTodoCount(true)
  }
})

// ── 待办数轮询（15s；变化即报宿主）──
let lastTodoCount = null
async function pollTodoCount(force = false) {
  try {
    const r = await jeeflowUi.api.processTask.todoList({ pageNum: 1, pageSize: 1 })
    if (force || r.recordCount !== lastTodoCount) {
      lastTodoCount = r.recordCount
      notifyHost({ type: 'jeeflow:todo-count', count: r.recordCount })
    }
  } catch { /* 后端不可达时静默 */ }
}
setInterval(() => pollTodoCount(), 15000)

createApp(App)
  .provide(JeeflowUiKey, jeeflowUi)
  .provide('embedStore', store)
  .mount('#app')

notifyHost({ type: 'jeeflow:ready', operator: store.operator, backend: store.backend })
pollTodoCount(true)
