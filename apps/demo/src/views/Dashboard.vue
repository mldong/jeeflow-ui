<template>
  <div>
    <!-- Stats -->
    <div class="stats">
      <div class="stat clickable" @click="scrollTo('todoCard')"><div class="num">{{ stats.todoCount }}</div><div class="label">我的待办</div></div>
      <div class="stat clickable" @click="scrollTo('instCard')"><div class="num">{{ stats.myInstanceCount }}</div><div class="label">我发起的流程</div></div>
      <div class="stat clickable" @click="scrollTo('startCard')"><div class="num">{{ defines.length }}</div><div class="label">可用流程</div></div>
    </div>

    <!-- Quick Start -->
    <div class="card" id="startCard">
      <h2>🚀 发起流程</h2>
      <div class="form-row">
        <select v-model="startDefId" style="flex:1" @change="onSelectDefine">
          <option :value="0">-- 选择流程定义 --</option>
          <option v-for="d in defines" :key="d.id" :value="d.id">{{ d.displayName }}</option>
        </select>
        <button class="btn btn-ghost btn-sm" @click="doPreview" :disabled="!startDefId" title="预览流程图">👁 预览</button>
        <button class="btn btn-primary" @click="doStart">发起</button>
        <button class="btn btn-demo" @click="runDemo" :disabled="demoRunning" title="一键演示完整闭环：发起→组长同意→经理退回→发起人收到">🎬 演示闭环</button>
      </div>
      <!-- issues/12：动态表单（按流程首个任务节点 form 渲染，值注入流程变量） -->
      <div v-if="startFormKey" class="dyn-form">
        <div class="dyn-form-title">📄 {{ startFormKey }}（变量将参与决策路由）</div>
        <div class="dyn-form-grid">
          <div v-for="f in startFormFields" :key="f.key" class="dyn-field">
            <label>{{ f.label }}<span v-if="f.required" class="req">*</span></label>
            <select v-if="f.type === 'select'" v-model="formValues[f.key]">
              <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
            </select>
            <input v-else :type="f.type === 'number' ? 'number' : 'text'" v-model="formValues[f.key]" :placeholder="f.label" />
          </div>
        </div>
      </div>
    </div>

    <!-- TODO List -->
    <div class="card" id="todoCard">
      <h2>
        📋 我的待办
        <span class="user-tabs">
          <button v-for="u in quickUsers" :key="u" :class="['user-tab', { active: currentUser === u }]" @click="switchUser(u)">{{ userLabels[u] || u }}</button>
        </span>
      </h2>
      <table v-if="todos.length" :key="'todo-' + listVersion" class="fade-in">
        <thead><tr><th>流程</th><th>任务</th><th>表单</th><th>时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="t in todos" :key="t.id" :class="{ 'row-flash': highlightTaskId === t.id }">
            <td>{{ t.defineName }}</td>
            <td><strong>{{ t.displayName }}</strong></td>
            <td style="color:#666;font-size:13px">{{ t.formKey || '-' }}</td>
            <td style="font-size:13px;color:#666">{{ fmtTime(t.createTime) }}</td>
            <td>
              <div style="display:flex;gap:6px">
                <button class="btn btn-primary btn-sm" @click="doApprove(t.id)">同意</button>
                <button class="btn btn-danger btn-sm" @click="doReject(t.id)">拒绝</button>
                <button class="btn btn-ghost btn-sm" @click="doRollback(t.id)">退回</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else style="color:#888;text-align:center;padding:20px">暂无待办</div>
    </div>

    <!-- My Instances -->
    <div class="card" id="instCard">
      <h2>📝 我发起的流程</h2>
      <table v-if="instances.length" :key="'inst-' + listVersion" class="fade-in">
        <thead><tr><th>ID</th><th>流程</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="i in instances" :key="i.id">
            <td style="font-size:13px;color:#666">{{ i.id }}</td>
            <td>{{ i.defineName }}</td>
            <td><span :class="['badge', stateBadge(i.state)]">{{ stateLabel(i.state) }}</span></td>
            <td style="font-size:13px;color:#666">{{ fmtTime(i.createTime) }}</td>
            <td><button class="btn btn-ghost btn-sm" @click="openDetail(i.id)">详情 →</button></td>
          </tr>
        </tbody>
      </table>
      <div v-else style="color:#888;text-align:center;padding:20px">暂无记录</div>
    </div>

    <!-- 我已处理（issues/12）：默认折叠 -->
    <div class="card" id="doneCard">
      <h2 style="cursor:pointer" @click="doneOpen = !doneOpen">📗 我已处理 <span style="font-size:13px;color:#888">{{ doneOpen ? '▾' : '▸' }}</span></h2>
      <table v-if="doneOpen && dones.length" :key="'done-' + listVersion" class="fade-in">
        <thead><tr><th>流程</th><th>任务</th><th>时间</th></tr></thead>
        <tbody>
          <tr v-for="t in dones" :key="t.id">
            <td>{{ t.defineName }}</td>
            <td><strong>{{ t.displayName }}</strong></td>
            <td style="font-size:13px;color:#666">{{ fmtTime(t.createTime) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="doneOpen && !dones.length" style="color:#888;text-align:center;padding:20px">暂无已办</div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import { fetchStats, fetchDefines, fetchTodoList, fetchDoneList, fetchInstances, fetchDefineDetail, startFlow, executeTask } from '../api.js'

const currentUser = inject('currentUser')
const toast = inject('toast')
const showToast = inject('showToast')
const demoMode = inject('demoMode')
const demoStep = inject('demoStep')
const openDetail = inject('openDetail')
const openPreview = inject('openPreview')

const stats = ref({ todoCount: 0, myInstanceCount: 0 })
const defines = ref([])
const todos = ref([])
const instances = ref([])

const startDefId = ref(0)
const formSchemas = inject('formSchemas')
const startFormKey = ref('')
const startFormFields = ref([])
const formValues = ref({})
const dones = ref([])
const doneOpen = ref(false)

// issues/11：操作行高亮 + 列表刷新淡入
const highlightTaskId = ref(null)
const listVersion = ref(0)
let demoRunning = false

const quickUsers = ['user1', 'leader', 'manager', 'boss', 'director', 'userA', 'userB', 'userC']
const userLabels = { leader: '组长', manager: '经理', boss: '老板', director: '总监' }

async function loadAll() {
  try {
    const [s, d, t, i, done] = await Promise.all([
      fetchStats(currentUser.value),
      fetchDefines(),
      fetchTodoList(currentUser.value),
      fetchInstances(currentUser.value),
      fetchDoneList(currentUser.value),
    ])
    stats.value = s
    defines.value = d
    todos.value = t
    instances.value = i
    dones.value = done
    listVersion.value++
  } catch (e) {
    showToast('加载失败，后端是否启动？', 'error')
  }
}

// issues/12：选择流程后按首个任务节点 form 渲染动态表单
async function onSelectDefine() {
  startFormKey.value = ''
  startFormFields.value = []
  formValues.value = {}
  if (!startDefId.value) return
  try {
    const def = defines.value.find(d => d.id === startDefId.value)
    if (!def) return
    const detail = await fetchDefineDetail(def.id)
    const graph = detail?.jsonObject || null
    let formKey = ''
    for (const n of graph?.nodes || []) {
      if (n?.type === 'snaker:task' && n?.properties?.form) { formKey = n.properties.form; break }
    }
    if (formKey) {
      startFormKey.value = formKey
      const schema = formSchemas[formKey] || [
        { key: 'reason', label: '事由', type: 'text' },
        { key: 'amount', label: '金额', type: 'number' },
      ]
      startFormFields.value = schema
      schema.forEach(f => { formValues.value[f.key] = f.type === 'select' ? (f.options?.[0] || '') : '' })
    }
  } catch (e) { /* 表单加载失败不阻塞发起 */ }
}

async function doStart() {
  if (!startDefId.value) return showToast('请选择流程定义', 'error')
  // 动态表单字段 → 流程变量（issues/12：表单变量参与决策路由）
  const extra = {}
  for (const f of startFormFields.value) {
    const v = formValues.value[f.key]
    if (f.required && (v === '' || v == null)) return showToast('请填写：' + f.label, 'error')
    if (v !== '' && v != null) extra[f.key] = f.type === 'number' ? Number(v) : v
  }
  try {
    await startFlow(startDefId.value, currentUser.value, undefined, extra)
    showToast('发起成功', 'success', true)
    startDefId.value = 0
    startFormKey.value = ''
    startFormFields.value = []
    formValues.value = {}
    await loadAll()
  } catch (e) { showToast('发起失败: ' + e.message, 'error') }
}

// issues/12：stats 联动——点击数字滚动到对应卡片
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function doPreview() {
  if (!startDefId.value) return
  const def = defines.value.find(d => d.id === startDefId.value)
  if (!def) return
  openPreview(def.id, def.displayName || def.name)
}

async function doApprove(taskId) {
  await handleTask(taskId, 1, '处理成功')  // 1=AGREE
}

async function doReject(taskId) {
  await handleTask(taskId, 2, '已驳回')  // 2=REJECT → 流程结束（实例 45）
}

async function doRollback(taskId) {
  await handleTask(taskId, 6, '已退回发起人')  // 6=ROLLBACK_TO_OPERATOR → 退回发起人
}

// issues/11：操作行高亮 0.9s 后再刷新（观众看得清处理了哪条）
async function handleTask(taskId, submitType, okMsg) {
  highlightTaskId.value = taskId
  try {
    await executeTask(taskId, currentUser.value, submitType)
    showToast(okMsg, 'success')
    await new Promise(r => setTimeout(r, 900))
    await loadAll()
  } catch (e) { showToast('失败: ' + e.message, 'error') }
  finally { highlightTaskId.value = null }
}

// issues/11：🎬 演示闭环——按剧本逐步执行并提示（多级审批：发起→组长同意→经理退回→发起人收到）
async function runDemo() {
  if (demoRunning) return
  const def = defines.value.find(d => d.name === '02-multi-task' || (d.displayName || '').includes('多级'))
  if (!def) { showToast('未找到多级审批流程（02-multi-task）', 'error'); return }
  demoRunning = true
  demoMode.value = true
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  try {
    // ① 发起（金额 500）
    demoStep.value = '① user1 发起「多级审批」流程（金额 500）'
    showToast('① 发起：多级审批（金额 500）', 'success', true)
    await startFlow(def.id, 'user1', 500)
    await loadAll()
    await sleep(1800)

    // ② 组长同意 → 流转经理
    switchUser('leader')
    await sleep(700)
    await loadAll()
    demoStep.value = '② 组长同意，流程流转到经理'
    showToast('② 组长同意 → 流转经理', 'success', true)
    const t1 = todos.value[0]
    if (t1) { await executeTask(t1.id, 'leader', 1); await sleep(900); await loadAll() }
    await sleep(1800)

    // ③ 经理退回发起人
    switchUser('manager')
    await sleep(700)
    await loadAll()
    demoStep.value = '③ 经理退回，流程回到发起人'
    showToast('③ 经理退回 → 回到发起人', 'success', true)
    const t2 = todos.value[0]
    if (t2) { await executeTask(t2.id, 'manager', 6); await sleep(900); await loadAll() }
    await sleep(1800)

    // ④ 发起人收到退回待办
    switchUser('user1')
    await sleep(700)
    await loadAll()
    demoStep.value = '④ 发起人收到退回待办，可重新提交'
    showToast('④ 发起人收到退回待办', 'success', true)
  } finally {
    demoRunning = false
  }
}

function switchUser(u) {
  currentUser.value = u
  localStorage.setItem('jeeflow_user', u)
  loadAll()
}

function stateBadge(s) {
  if (s === 10 || s === 'DOING') return 'badge-doing'
  if (s === 20 || s === 'DONE') return 'badge-done'
  if (s === 45 || s === 'REJECT') return 'badge-reject'
  return ''
}
function stateLabel(s) {
  if (s === 10 || s === 'DOING') return '进行中'
  if (s === 20 || s === 'DONE') return '已完成'
  if (s === 45 || s === 'REJECT') return '已拒绝'
  return s
}

function fmtTime(t) {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(loadAll)
</script>
